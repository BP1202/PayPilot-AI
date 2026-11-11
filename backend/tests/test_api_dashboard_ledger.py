import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.core.seed import seed_demo_data
from app.main import app


@pytest.fixture
def client_with_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    # Seed demo data
    with TestingSession() as seed_session:
        seed_demo_data(seed_session)

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


def test_get_dashboard_overview_endpoint(client_with_db):
    token = create_access_token(
        user_id="owner_default", email="owner@apexgearworks.demo"
    )
    headers = {"Authorization": f"Bearer {token}"}
    response = client_with_db.get("/api/v1/dashboard/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["business"]["name"] == "Apex Precision Gearworks"
    assert data["business"]["currency"] == "USD"

    totals = data["totals"]
    assert totals["total_revenue"] == "10135.75"
    assert totals["completed_count"] == 4
    assert totals["pending_count"] == 1
    assert totals["pending_total"] == "2650.00"
    assert totals["transaction_count"] == 5


def test_dashboard_does_not_create_business_for_individual_solver(client_with_db):
    registration = client_with_db.post(
        "/api/v1/auth/register",
        json={
            "email": "solver.without.business@opnly-demo.test",
            "password": "SecureDemoPassword123!",
            "full_name": "Individual Solver",
        },
    )
    assert registration.status_code == 201
    token = registration.json()["access_token"]

    response = client_with_db.get(
        "/api/v1/dashboard/overview",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["business"] is None
    assert data["totals"]["transaction_count"] == 0
    assert data["totals"]["total_revenue"] == "0.00"


def test_get_ledger_transactions_endpoint(client_with_db):
    response = client_with_db.get("/api/v1/ledger")
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert data["total"] == 5
    assert len(data["items"]) == 5

    # Check structure of transaction item
    first = data["items"][0]
    assert "transaction_ref" in first
    assert "amount" in first
    assert "status" in first
    assert "payment_method" in first


def test_get_ledger_transactions_filtered_by_status(client_with_db):
    # Filter completed
    comp_resp = client_with_db.get("/api/v1/ledger?status=COMPLETED")
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["total"] == 4
    for item in comp_data["items"]:
        assert item["status"] == "COMPLETED"

    # Filter pending
    pend_resp = client_with_db.get("/api/v1/ledger?status=PENDING")
    assert pend_resp.status_code == 200
    pend_data = pend_resp.json()
    assert pend_data["total"] == 1
    assert pend_data["items"][0]["status"] == "PENDING"
