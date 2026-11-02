from decimal import Decimal

import pytest
from app.core.database import Base, get_db
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


def test_get_copilot_recommendation_endpoint(client_with_db):
    response = client_with_db.get("/api/v1/copilot/recommendation")
    assert response.status_code == 200
    data = response.json()

    assert data["mode"] == "DETERMINISTIC_DEMO"
    assert "title" in data
    assert "financial_impact" in data
    assert Decimal(data["financial_impact"]["current_revenue"]) == Decimal("10135.75")
    assert Decimal(data["financial_impact"]["projected_revenue"]) == Decimal("12785.75")
    assert Decimal(data["financial_impact"]["net_change"]) == Decimal("2650.00")

    assert data["suggested_action"]["action_type"] == "APPROVE_CUSTOMER_PAYMENT"
    assert data["suggested_action"]["transaction_ref"] == "TXN-DEMO-202611-005"


def test_copilot_chat_endpoint(client_with_db):
    payload = {"prompt": "What is our financial health and pending revenue?"}
    response = client_with_db.post("/api/v1/copilot/chat", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["mode"] == "DETERMINISTIC_DEMO"
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert "context_summary" in data
    assert data["context_summary"]["total_revenue"] == "10135.75"
