from decimal import Decimal

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


def test_create_order_endpoint(client_with_db):
    payload = {
        "amount": "1450.00",
        "currency": "USD",
        "description": "Custom Helical Pinion Shaft",
        "customer_name": "Hyperion Drives",
        "customer_email": "hyperion@demo.com",
    }
    response = client_with_db.post("/api/v1/payments/create-order", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["transaction_ref"].startswith("TXN-")
    assert data["status"] == "PENDING"
    assert data["amount"] == "1450.00"
    assert data["provider_reference"].startswith("SIM-PAYPAL-ORD-")


def test_approve_payment_requires_explicit_owner_approval(client_with_db):
    # Retrieve the existing pending transaction from seed data
    ledger_resp = client_with_db.get("/api/v1/ledger?status=PENDING")
    assert ledger_resp.status_code == 200
    pending_txn = ledger_resp.json()["items"][0]
    txn_ref = pending_txn["transaction_ref"]

    # Attempt capture with owner_approved = False
    reject_payload = {
        "transaction_ref": txn_ref,
        "owner_approved": False,
        "idempotency_key": "test-key-reject",
    }
    reject_resp = client_with_db.post("/api/v1/payments/approve", json=reject_payload)
    assert reject_resp.status_code == 400
    assert "Owner approval is strictly required" in reject_resp.json()["detail"]


def test_approve_payment_success_and_updates_ledger_and_totals(client_with_db):
    # Check initial totals
    token = create_access_token(
        user_id="owner_default", email="owner@apexgearworks.demo"
    )
    auth_headers = {"Authorization": f"Bearer {token}"}
    initial_ov = client_with_db.get(
        "/api/v1/dashboard/overview", headers=auth_headers
    ).json()["totals"]
    initial_revenue = Decimal(initial_ov["total_revenue"])
    initial_completed = initial_ov["completed_count"]
    initial_pending = initial_ov["pending_count"]

    # Pending seed transaction is $2650.00
    ledger_resp = client_with_db.get("/api/v1/ledger?status=PENDING")
    pending_txn = ledger_resp.json()["items"][0]
    txn_ref = pending_txn["transaction_ref"]
    txn_amount = Decimal(pending_txn["amount"])

    # Owner approves payment
    approve_payload = {
        "transaction_ref": txn_ref,
        "owner_approved": True,
        "idempotency_key": "test-key-approve-001",
    }
    approve_resp = client_with_db.post("/api/v1/payments/approve", json=approve_payload)
    assert approve_resp.status_code == 200
    res_data = approve_resp.json()
    assert res_data["status"] == "COMPLETED"
    assert res_data["provider_reference"].startswith("SIM-PAYPAL-CAP-")

    # Verify updated dashboard totals
    updated_ov = client_with_db.get(
        "/api/v1/dashboard/overview", headers=auth_headers
    ).json()["totals"]
    assert Decimal(updated_ov["total_revenue"]) == initial_revenue + txn_amount
    assert updated_ov["completed_count"] == initial_completed + 1
    assert updated_ov["pending_count"] == initial_pending - 1


def test_approve_payment_not_found(client_with_db):
    payload = {
        "transaction_ref": "TXN-NON-EXISTENT-999",
        "owner_approved": True,
        "idempotency_key": "test-key-404",
    }
    response = client_with_db.post("/api/v1/payments/approve", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
