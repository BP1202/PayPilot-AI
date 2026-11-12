from datetime import timedelta

import pytest
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.core.seed import seed_demo_data
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def client_with_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestingSession() as session:
        seed_demo_data(session)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def test_user_registration_success(client_with_db):
    res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "innovator@paypilot.demo",
            "password": "SecurePassword123!",
            "full_name": "Jane Innovator",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "innovator@paypilot.demo"
    assert data["user"]["full_name"] == "Jane Innovator"
    assert data["user"]["is_active"] is True
    assert "hashed_password" not in data["user"]


def test_user_registration_duplicate_email(client_with_db):
    client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@paypilot.demo",
            "password": "SecurePassword123!",
            "full_name": "First User",
        },
    )
    res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@paypilot.demo",
            "password": "AnotherPassword456!",
            "full_name": "Duplicate User",
        },
    )
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"].lower()


def test_user_registration_weak_password_rejected(client_with_db):
    res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "weak@paypilot.demo",
            "password": "short",
            "full_name": "Weak Password User",
        },
    )
    assert res.status_code == 422


def test_user_registration_invalid_email_rejected(client_with_db):
    res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "SecurePassword123!",
            "full_name": "Bad Email User",
        },
    )
    assert res.status_code == 422


def test_user_login_success(client_with_db):
    client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "login_test@paypilot.demo",
            "password": "StrongPassword987!",
            "full_name": "Login Tester",
        },
    )
    res = client_with_db.post(
        "/api/v1/auth/login",
        json={
            "email": "login_test@paypilot.demo",
            "password": "StrongPassword987!",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "login_test@paypilot.demo"


def test_user_login_invalid_password(client_with_db):
    client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "wrong_pw@paypilot.demo",
            "password": "CorrectPassword123!",
            "full_name": "Wrong Pw Tester",
        },
    )
    res = client_with_db.post(
        "/api/v1/auth/login",
        json={
            "email": "wrong_pw@paypilot.demo",
            "password": "WrongPassword!",
        },
    )
    assert res.status_code == 401
    assert "incorrect email or password" in res.json()["detail"].lower()


def test_user_login_nonexistent_email(client_with_db):
    res = client_with_db.post(
        "/api/v1/auth/login",
        json={
            "email": "does_not_exist@paypilot.demo",
            "password": "SomePassword123!",
        },
    )
    assert res.status_code == 401


def test_auth_me_endpoint_with_valid_token(client_with_db):
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "me_test@paypilot.demo",
            "password": "SecurePassword123!",
            "full_name": "Me User",
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client_with_db.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me_test@paypilot.demo"
    assert data["full_name"] == "Me User"


def test_auth_me_missing_token_returns_401(client_with_db):
    res = client_with_db.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "WWW-Authenticate" in res.headers
    assert res.headers["WWW-Authenticate"] == "Bearer"


def test_auth_me_invalid_token_returns_401(client_with_db):
    headers = {"Authorization": "Bearer fake.tampered.token"}
    res = client_with_db.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401


def test_auth_me_expired_token_returns_401(client_with_db):
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "expired@paypilot.demo",
            "password": "SecurePassword123!",
            "full_name": "Expired User",
        },
    )
    user_id = reg.json()["user"]["id"]
    expired_token = create_access_token(
        user_id=user_id,
        email="expired@paypilot.demo",
        expires_delta=timedelta(seconds=-10),
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    res = client_with_db.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_x_user_id_header_is_never_trusted_without_valid_bearer(client_with_db):
    # Attempting to impersonate owner_default via X-User-ID header without Bearer token
    headers = {"X-User-ID": "owner_default"}
    res = client_with_db.get("/api/v1/dashboard/overview", headers=headers)
    assert res.status_code == 401
    assert "WWW-Authenticate" in res.headers


def test_authenticated_user_identity_overrides_x_user_id_spoof(client_with_db):
    # Attacker registers account
    reg_res = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "attacker@paypilot.demo",
            "password": "Password123!",
            "full_name": "Attacker",
        },
    )
    attacker_id = reg_res.json()["user"]["id"]
    token = reg_res.json()["access_token"]

    # Attacker passes valid token for Attacker, but sends X-User-ID spoofing owner_default
    headers = {
        "Authorization": f"Bearer {token}",
        "X-User-ID": "owner_default",
    }
    res = client_with_db.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    # Verified identity must be attacker, not owner_default
    assert res.json()["id"] == attacker_id
    assert res.json()["email"] == "attacker@paypilot.demo"


def test_business_creation_ignores_body_user_id_override(client_with_db):
    # Register genuine user
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "genuine_owner@paypilot.demo",
            "password": "Password123!",
            "full_name": "Genuine Owner",
        },
    )
    genuine_id = reg.json()["user"]["id"]
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to supply a different user_id in the request payload
    payload = {
        "name": "Genuine Enterprise",
        "currency": "USD",
        "description": "Legitimate business",
        "user_id": "spoofed_target_victim_id",
    }
    res = client_with_db.post("/api/v1/business", json=payload, headers=headers)
    assert res.status_code == 201
    # Server-side business profile MUST be attached to genuine authenticated user
    assert res.json()["user_id"] == genuine_id
    assert res.json()["user_id"] != "spoofed_target_victim_id"


def test_public_opportunity_analysis_vs_protected_draft_saving(client_with_db):
    # 1. Unauthenticated exploratory analysis is allowed
    analyze_payload = {
        "description": "We manufacture low-cost water filtration devices for rural farms.",
        "submission_type": "IDEA",
    }
    unauth_res = client_with_db.post(
        "/api/v1/opportunities/analyze", json=analyze_payload
    )
    assert unauth_res.status_code == 200
    unauth_data = unauth_res.json()
    assert unauth_data["analysis"]["problem_statement"] != ""
    assert unauth_data["mode"] is not None

    # 2. Saving an opportunity draft strictly requires authenticated identity
    create_payload = {
        "submission_type": "IDEA",
        "title": "Water Filtration Systems",
        "original_description": "We manufacture low-cost water filtration devices for rural farms.",
        "problem_statement": "Rural farms lack affordable clean irrigation water.",
        "status": "DRAFT",
    }
    unauth_save_res = client_with_db.post("/api/v1/opportunities", json=create_payload)
    assert unauth_save_res.status_code == 401

    # 3. Authenticated user can save and retrieve draft
    reg = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "watertech@paypilot.demo",
            "password": "Password123!",
            "full_name": "Water Tech",
        },
    )
    token = reg.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    auth_save_res = client_with_db.post(
        "/api/v1/opportunities", json=create_payload, headers=auth_headers
    )
    assert auth_save_res.status_code == 201
    opp_id = auth_save_res.json()["id"]

    # 4. Another user cannot access the saved draft (403 Forbidden)
    reg_other = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "other_innovator@paypilot.demo",
            "password": "Password123!",
            "full_name": "Other Innovator",
        },
    )
    other_headers = {"Authorization": f"Bearer {reg_other.json()['access_token']}"}

    forbidden_res = client_with_db.get(
        f"/api/v1/opportunities/{opp_id}", headers=other_headers
    )
    assert forbidden_res.status_code == 403
