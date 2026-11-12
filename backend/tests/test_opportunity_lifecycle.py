import pytest
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


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


def make_user(
    db: Session,
    user_id: str,
    email: str,
    full_name: str = "Test User",
) -> tuple[User, str]:
    user = User(
        id=user_id,
        email=email,
        full_name=full_name,
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user_id=user.id, email=user.email)
    return user, token


def create_valid_draft(client: TestClient, token: str, **kwargs) -> dict:
    payload = {
        "title": kwargs.get("title", "Autonomous Fleet Dispatching Platform"),
        "original_description": kwargs.get(
            "original_description",
            "An AI-powered dispatch optimization platform for regional trucking logistics.",
        ),
        "submission_type": kwargs.get("submission_type", "IDEA"),
        "intent": kwargs.get("intent", "OFFERING_SOLUTION"),
        "category": kwargs.get("category", "TECH"),
        "industry": kwargs.get("industry", "Logistics & Freight"),
        "proposed_solution": kwargs.get(
            "proposed_solution",
            "Dynamic route clustering and algorithmic load matching.",
        ),
        "problem_statement": kwargs.get(
            "problem_statement",
            "Mid-sized freight carriers suffer 25% deadhead miles.",
        ),
        "target_customer_segments": kwargs.get(
            "target_customer_segments", ["Regional Carriers", "Freight Dispatchers"]
        ),
        "required_skills_and_resources": kwargs.get(
            "required_skills_and_resources", ["Python", "FastAPI", "Route Optimization"]
        ),
        "value_proposition": kwargs.get(
            "value_proposition", "Reduce deadhead mileage by 18%."
        ),
        "visibility": kwargs.get("visibility", "PRIVATE"),
        "business_id": kwargs.get("business_id", None),
    }
    res = client.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert res.status_code == 201
    return res.json()


# ---------------------------------------------------------------------------
# 1. Lifecycle Transitions: Publish, Unpublish, Close
# ---------------------------------------------------------------------------


def test_publish_valid_opportunity_draft(client_with_db, test_db_session):
    _, token = make_user(test_db_session, "user_alice", "alice@test.demo")
    draft = create_valid_draft(client_with_db, token)

    # Publish draft with target visibility PUBLIC
    pub_res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"visibility": "PUBLIC"},
    )
    assert pub_res.status_code == 200
    published = pub_res.json()

    assert published["status"] == "PUBLISHED"
    assert published["visibility"] == "PUBLIC"
    assert published["published_at"] is not None
    assert published["intent"] == "OFFERING_SOLUTION"
    assert published["category"] == "TECH"


def test_publish_validation_failure_on_missing_required_fields(
    client_with_db, test_db_session
):
    _, token = make_user(test_db_session, "user_bob", "bob@test.demo")

    # Create incomplete draft missing industry and commercial clarity
    create_res = client_with_db.post(
        "/api/v1/opportunities",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Hi",  # Too short (< 5 chars)
            "original_description": "Short desc",
            "submission_type": "IDEA",
            "intent": "SEEKING_SOLUTION",
            "category": "BUSINESS",
            "industry": "",  # Missing industry
        },
    )
    assert create_res.status_code == 201
    incomplete = create_res.json()

    # Attempt to publish incomplete draft -> 422 with validation errors
    pub_res = client_with_db.post(
        f"/api/v1/opportunities/{incomplete['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"visibility": "PUBLIC"},
    )
    assert pub_res.status_code == 422
    data = pub_res.json()
    assert "Cannot publish opportunity" in data["detail"]
    assert "Title must be at least 5 characters" in data["detail"]
    assert "Industry sector must be specified" in data["detail"]


def test_unpublish_opportunity_reverts_to_private_draft(
    client_with_db, test_db_session
):
    _, token = make_user(test_db_session, "user_charlie", "charlie@test.demo")
    draft = create_valid_draft(client_with_db, token)

    # Publish
    client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"visibility": "PUBLIC"},
    )

    # Unpublish
    unpub_res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/unpublish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert unpub_res.status_code == 200
    reverted = unpub_res.json()

    assert reverted["status"] == "DRAFT"
    assert reverted["visibility"] == "PRIVATE"


def test_close_opportunity_and_prevent_silent_republishing(
    client_with_db, test_db_session
):
    _, token = make_user(test_db_session, "user_dave", "dave@test.demo")
    draft = create_valid_draft(client_with_db, token)

    # Close opportunity
    close_res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/close",
        headers={"Authorization": f"Bearer {token}"},
        json={"reason": "Opportunity achieved desired outcome."},
    )
    assert close_res.status_code == 200
    closed = close_res.json()
    assert closed["status"] == "CLOSED"
    assert closed["closed_at"] is not None

    # Attempt to publish a closed opportunity -> 422
    repub_res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/publish",
        headers={"Authorization": f"Bearer {token}"},
        json={"visibility": "PUBLIC"},
    )
    assert repub_res.status_code == 422
    assert "Closed opportunities cannot be republished" in repub_res.json()["detail"]

    # Attempt to unpublish a closed opportunity -> 422
    unpub_res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/unpublish",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert unpub_res.status_code == 422

    # Attempt to modify status back to DRAFT or PUBLISHED via general update -> 422
    update_res = client_with_db.put(
        f"/api/v1/opportunities/{draft['id']}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "DRAFT"},
    )
    assert update_res.status_code == 422
    assert "Closed opportunities cannot be reopened" in update_res.json()["detail"]


# ---------------------------------------------------------------------------
# 2. Ownership & Authorization Checks
# ---------------------------------------------------------------------------


def test_non_owner_forbidden_from_lifecycle_mutations(client_with_db, test_db_session):
    _, owner_token = make_user(test_db_session, "user_owner", "owner@test.demo")
    _, intruder_token = make_user(
        test_db_session, "user_intruder", "intruder@test.demo"
    )
    draft = create_valid_draft(client_with_db, owner_token)

    # Intruder attempts to publish
    res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/publish",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403

    # Intruder attempts to unpublish
    res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/unpublish",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403

    # Intruder attempts to close
    res = client_with_db.post(
        f"/api/v1/opportunities/{draft['id']}/close",
        headers={"Authorization": f"Bearer {intruder_token}"},
    )
    assert res.status_code == 403

    # Intruder attempts to update visibility
    res = client_with_db.put(
        f"/api/v1/opportunities/{draft['id']}/visibility",
        headers={"Authorization": f"Bearer {intruder_token}"},
        json={"visibility": "PUBLIC"},
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# 3. Visibility Matrix Enforcement on Reads
# ---------------------------------------------------------------------------


def test_visibility_matrix_on_opportunity_reads(client_with_db, test_db_session):
    _, owner_token = make_user(test_db_session, "user_vis_owner", "vis_owner@test.demo")
    _, member_token = make_user(test_db_session, "user_member", "member@test.demo")

    draft = create_valid_draft(client_with_db, owner_token, visibility="PRIVATE")
    opp_id = draft["id"]

    # 1. Unpublished Draft:
    # Owner sees it
    assert (
        client_with_db.get(
            f"/api/v1/opportunities/{opp_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
        ).status_code
        == 200
    )

    # Unauthenticated guest gets 401 (drafts require authentication)
    assert client_with_db.get(f"/api/v1/opportunities/{opp_id}").status_code == 401

    # Non-owner member gets 403
    assert (
        client_with_db.get(
            f"/api/v1/opportunities/{opp_id}",
            headers={"Authorization": f"Bearer {member_token}"},
        ).status_code
        == 403
    )

    # 2. Publish as AUTHENTICATED (Members Only):
    client_with_db.post(
        f"/api/v1/opportunities/{opp_id}/publish",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"visibility": "AUTHENTICATED"},
    )

    # Owner sees it
    assert (
        client_with_db.get(
            f"/api/v1/opportunities/{opp_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
        ).status_code
        == 200
    )

    # Guest gets 401 Unauthorized
    assert client_with_db.get(f"/api/v1/opportunities/{opp_id}").status_code == 401

    # Authenticated member sees it
    member_res = client_with_db.get(
        f"/api/v1/opportunities/{opp_id}",
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert member_res.status_code == 200

    # 3. Update visibility to PUBLIC:
    client_with_db.put(
        f"/api/v1/opportunities/{opp_id}/visibility",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"visibility": "PUBLIC"},
    )

    # Guest sees it
    guest_res = client_with_db.get(f"/api/v1/opportunities/{opp_id}")
    assert guest_res.status_code == 200
    assert guest_res.json()["title"] == draft["title"]


def test_list_published_opportunities_enforces_visibility(
    client_with_db, test_db_session
):
    _, owner_token = make_user(test_db_session, "user_pub_owner", "pub_owner@test.demo")
    _, member_token = make_user(test_db_session, "user_member2", "member2@test.demo")

    # Draft 1: Published PUBLIC
    d1 = create_valid_draft(client_with_db, owner_token, title="Public Solar Grid")
    client_with_db.post(
        f"/api/v1/opportunities/{d1['id']}/publish",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"visibility": "PUBLIC"},
    )

    # Draft 2: Published AUTHENTICATED
    d2 = create_valid_draft(
        client_with_db, owner_token, title="Member-Only Aerospace Sensors"
    )
    client_with_db.post(
        f"/api/v1/opportunities/{d2['id']}/publish",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"visibility": "AUTHENTICATED"},
    )

    # Draft 3: Private Draft (Unpublished)
    create_valid_draft(client_with_db, owner_token, title="Secret Unpublished Draft")

    # Guest queries /opportunities/published: sees ONLY public (d1)
    guest_feed = client_with_db.get("/api/v1/opportunities/published").json()
    assert guest_feed["total"] == 1
    assert guest_feed["items"][0]["title"] == "Public Solar Grid"

    # Authenticated member queries /opportunities/published: sees public (d1) and authenticated (d2)
    member_feed = client_with_db.get(
        "/api/v1/opportunities/published",
        headers={"Authorization": f"Bearer {member_token}"},
    ).json()
    assert member_feed["total"] == 2
    titles = [item["title"] for item in member_feed["items"]]
    assert "Public Solar Grid" in titles
    assert "Member-Only Aerospace Sensors" in titles
    assert "Secret Unpublished Draft" not in titles
