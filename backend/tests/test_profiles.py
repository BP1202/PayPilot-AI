import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User
from app.repositories.business_repository import BusinessRepository


@pytest.fixture
def test_db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client_with_db(test_db_session: Session):
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def create_test_user(
    db: Session,
    email: str = "alice@example.com",
    user_id: str = "user_alice",
    full_name: str = "Alice Founder",
) -> tuple[User, str]:
    user = User(
        id=user_id,
        email=email,
        full_name=full_name,
        hashed_password=hash_password("ValidPass123!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return user, token


# ---------------------------------------------------------------------------
# Unit / API Tests: /profiles/me
# ---------------------------------------------------------------------------


def test_get_profiles_me_unauthorized(client_with_db):
    res = client_with_db.get("/api/v1/profiles/me")
    assert res.status_code == 401


def test_get_profiles_me_lazy_creates_individual_and_returns_completeness(
    client_with_db, test_db_session
):
    _, token = create_test_user(test_db_session, "user1@example.com", "user_1")

    res = client_with_db.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()

    assert "individual" in data
    assert data["individual"]["user_id"] == "user_1"
    assert data["individual"]["completeness_percent"] == 0
    assert len(data["individual"]["missing_fields"]) == 6
    assert "businesses" in data
    assert isinstance(data["businesses"], list)


def test_update_individual_profile(client_with_db, test_db_session):
    _, token = create_test_user(test_db_session, "user2@example.com", "user_2")

    update_payload = {
        "headline": "Lead Solutions Architect",
        "bio": "15+ years experience building cloud-native distributed systems.",
        "location": "San Francisco, CA",
        "industry": "TECH",
        "skills": ["Python", "TypeScript", "FastAPI", "React"],
        "interests": ["Open Source", "Distributed Systems"],
        "visibility": "PUBLIC",
    }

    res = client_with_db.put(
        "/api/v1/profiles/me/individual",
        headers={"Authorization": f"Bearer {token}"},
        json=update_payload,
    )
    assert res.status_code == 200
    data = res.json()

    assert data["headline"] == "Lead Solutions Architect"
    assert data["location"] == "San Francisco, CA"
    assert data["skills"] == ["Python", "TypeScript", "FastAPI", "React"]
    assert data["visibility"] == "PUBLIC"
    assert data["completeness_percent"] == 100
    assert data["missing_fields"] == []


def test_update_business_profile_ownership_enforcement(client_with_db, test_db_session):
    user_a, token_a = create_test_user(
        test_db_session, "owner@example.com", "user_owner"
    )
    _user_b, token_b = create_test_user(
        test_db_session, "other@example.com", "user_other"
    )

    biz_repo = BusinessRepository(test_db_session)
    biz = biz_repo.get_or_create_default_business(
        name="Owner Manufacturing Corp",
        user_id=user_a.id,
    )

    # User B attempts to update User A's business -> 403 Forbidden
    res_b = client_with_db.put(
        f"/api/v1/profiles/me/businesses/{biz.id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"location": "Austin, TX"},
    )
    assert res_b.status_code == 403

    # User A updates own business -> 200 OK
    res_a = client_with_db.put(
        f"/api/v1/profiles/me/businesses/{biz.id}",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "location": "Austin, TX",
            "skills": ["Precision Milling", "CNC Prototyping"],
            "interests": ["Robotics", "Aerospace"],
            "visibility": "AUTHENTICATED",
        },
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["location"] == "Austin, TX"
    assert data_a["visibility"] == "AUTHENTICATED"
    assert "Precision Milling" in data_a["skills"]


# ---------------------------------------------------------------------------
# Privacy Matrix Tests: /profiles/individuals/{user_id}
# ---------------------------------------------------------------------------


def test_individual_profile_privacy_matrix(client_with_db, test_db_session):
    user_owner, token_owner = create_test_user(
        test_db_session, "owner_priv@example.com", "user_owner_priv"
    )
    _, token_guest = create_test_user(
        test_db_session, "viewer@example.com", "user_viewer"
    )

    # Initialize owner's individual profile
    client_with_db.get(
        "/api/v1/profiles/me",
        headers={"Authorization": f"Bearer {token_owner}"},
    )

    # 1. Default PRIVATE:
    # Owner sees full profile
    res_owner = client_with_db.get(
        f"/api/v1/profiles/individuals/{user_owner.id}",
        headers={"Authorization": f"Bearer {token_owner}"},
    )
    assert res_owner.status_code == 200

    # Unauthenticated requester gets 403
    res_anon = client_with_db.get(f"/api/v1/profiles/individuals/{user_owner.id}")
    assert res_anon.status_code == 403

    # Other authenticated user gets 403
    res_other = client_with_db.get(
        f"/api/v1/profiles/individuals/{user_owner.id}",
        headers={"Authorization": f"Bearer {token_guest}"},
    )
    assert res_other.status_code == 403

    # 2. Set to AUTHENTICATED:
    client_with_db.put(
        "/api/v1/profiles/me/individual",
        headers={"Authorization": f"Bearer {token_owner}"},
        json={"visibility": "AUTHENTICATED", "headline": "Auth-Only Headline"},
    )

    # Unauthenticated requester gets 401
    res_anon_auth = client_with_db.get(f"/api/v1/profiles/individuals/{user_owner.id}")
    assert res_anon_auth.status_code == 401

    # Authenticated user gets public/filtered profile
    res_other_auth = client_with_db.get(
        f"/api/v1/profiles/individuals/{user_owner.id}",
        headers={"Authorization": f"Bearer {token_guest}"},
    )
    assert res_other_auth.status_code == 200
    assert res_other_auth.json()["headline"] == "Auth-Only Headline"

    # 3. Set to PUBLIC:
    client_with_db.put(
        "/api/v1/profiles/me/individual",
        headers={"Authorization": f"Bearer {token_owner}"},
        json={"visibility": "PUBLIC", "headline": "Public Headline"},
    )

    # Unauthenticated gets 200
    res_anon_pub = client_with_db.get(f"/api/v1/profiles/individuals/{user_owner.id}")
    assert res_anon_pub.status_code == 200
    assert res_anon_pub.json()["headline"] == "Public Headline"


# ---------------------------------------------------------------------------
# Business Profile Privacy Matrix Tests: /profiles/organizations/{business_id}
# ---------------------------------------------------------------------------


def test_business_profile_privacy_matrix(client_with_db, test_db_session):
    user_owner, token_owner = create_test_user(
        test_db_session, "bizowner@example.com", "user_bizowner"
    )
    _, token_guest = create_test_user(
        test_db_session, "bizviewer@example.com", "user_bizviewer"
    )

    biz_repo = BusinessRepository(test_db_session)
    biz = biz_repo.get_or_create_default_business(
        name="Private Org Ltd",
        user_id=user_owner.id,
    )

    # 1. PRIVATE
    assert (
        client_with_db.get(f"/api/v1/profiles/organizations/{biz.id}").status_code
        == 403
    )
    assert (
        client_with_db.get(
            f"/api/v1/profiles/organizations/{biz.id}",
            headers={"Authorization": f"Bearer {token_guest}"},
        ).status_code
        == 403
    )
    assert (
        client_with_db.get(
            f"/api/v1/profiles/organizations/{biz.id}",
            headers={"Authorization": f"Bearer {token_owner}"},
        ).status_code
        == 200
    )

    # 2. AUTHENTICATED
    client_with_db.put(
        f"/api/v1/profiles/me/businesses/{biz.id}",
        headers={"Authorization": f"Bearer {token_owner}"},
        json={"visibility": "AUTHENTICATED"},
    )
    assert (
        client_with_db.get(f"/api/v1/profiles/organizations/{biz.id}").status_code
        == 401
    )
    assert (
        client_with_db.get(
            f"/api/v1/profiles/organizations/{biz.id}",
            headers={"Authorization": f"Bearer {token_guest}"},
        ).status_code
        == 200
    )

    # 3. PUBLIC
    client_with_db.put(
        f"/api/v1/profiles/me/businesses/{biz.id}",
        headers={"Authorization": f"Bearer {token_owner}"},
        json={"visibility": "PUBLIC"},
    )
    res_pub = client_with_db.get(f"/api/v1/profiles/organizations/{biz.id}")
    assert res_pub.status_code == 200
    assert res_pub.json()["name"] == "Private Org Ltd"


# ---------------------------------------------------------------------------
# Opportunity business_id Ownership Validation
# ---------------------------------------------------------------------------


def test_opportunity_creation_validates_business_id_ownership(
    client_with_db, test_db_session
):
    user_a, token_a = create_test_user(test_db_session, "usera@example.com", "user_a")
    _user_b, token_b = create_test_user(test_db_session, "userb@example.com", "user_b")

    biz_repo = BusinessRepository(test_db_session)
    biz_a = biz_repo.get_or_create_default_business(
        name="User A Biz", user_id=user_a.id
    )

    # User B attempts to link User A's business_id to an opportunity -> 403
    payload = {
        "title": "Unauthorized Linked Business Opportunity",
        "original_description": "We need specialized manufacturing parts for aerospace sensors.",
        "submission_type": "PROBLEM",
        "business_id": biz_a.id,
    }

    res_b = client_with_db.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {token_b}"},
        json=payload,
    )
    assert res_b.status_code == 403
    assert "Linked business does not belong" in res_b.json()["detail"]

    # User A links own business_id -> 201 Created
    res_a = client_with_db.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {token_a}"},
        json=payload,
    )
    assert res_a.status_code == 201
    assert res_a.json()["business_id"] == biz_a.id


# ---------------------------------------------------------------------------
# Hardened business_repository.get_or_create_default_business
# ---------------------------------------------------------------------------


def test_hardened_get_or_create_default_business_user_isolation(test_db_session):
    repo = BusinessRepository(test_db_session)

    # First user creates demo business
    biz1 = repo.get_or_create_default_business(user_id="user_alpha")
    assert biz1.user_id == "user_alpha"

    # Second user requests default business with their user_id
    biz2 = repo.get_or_create_default_business(user_id="user_beta")
    assert biz2.user_id == "user_beta"
    assert biz2.id != biz1.id  # Never leak user_alpha's business to user_beta!
