from decimal import Decimal

import pytest
from app.core.database import Base
from app.core.seed import seed_demo_data
from app.models.transaction import Transaction, TransactionStatus
from app.services.copilot_service import CopilotMode, CopilotService
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def copilot_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        seed_demo_data(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_copilot_generates_deterministic_recommendation_when_no_api_key(
    copilot_session,
):
    service = CopilotService(db=copilot_session, api_key="")
    rec = service.get_decision_recommendation()

    assert rec.mode == CopilotMode.DETERMINISTIC_DEMO
    assert rec.title is not None
    assert "Stratos Dynamics" in rec.reasoning or "Order #1046" in rec.reasoning

    # Verify financial impact numbers match seed data exactly
    # 4 completed = $10,135.75; pending = $2,650.00; projected = $12,785.75
    impact = rec.financial_impact
    assert impact.current_revenue == Decimal("10135.75")
    assert impact.projected_revenue == Decimal("12785.75")
    assert impact.net_change == Decimal("2650.00")
    assert impact.percentage_increase > Decimal("26.0")

    # Verify suggested action payload
    action = rec.suggested_action
    assert action is not None
    assert action.action_type == "APPROVE_CUSTOMER_PAYMENT"
    assert action.transaction_ref == "TXN-DEMO-202611-005"
    assert action.amount == Decimal("2650.00")


def test_copilot_recommendation_when_no_pending_transactions(copilot_session):
    # Mark all transactions completed
    pending_txs = (
        copilot_session.query(Transaction)
        .filter(Transaction.status == TransactionStatus.PENDING)
        .all()
    )
    for tx in pending_txs:
        tx.status = TransactionStatus.COMPLETED
    copilot_session.commit()

    service = CopilotService(db=copilot_session, api_key="")
    rec = service.get_decision_recommendation()

    assert "Zero Pending" in rec.title or "Reconciled" in rec.title
    assert rec.suggested_action is None
    assert rec.financial_impact.net_change == Decimal("0.00")


def test_copilot_chat_answers_revenue_query(copilot_session):
    service = CopilotService(db=copilot_session, api_key="")
    response = service.chat(prompt="What is our current total revenue?")

    assert response.mode == CopilotMode.DETERMINISTIC_DEMO
    assert "10,135.75" in response.reply or "10135.75" in response.reply
    assert response.context_summary["completed_count"] == 4


def test_copilot_chat_answers_pending_order_query(copilot_session):
    service = CopilotService(db=copilot_session, api_key="")
    response = service.chat(prompt="Do we have any pending payments to review?")

    assert response.mode == CopilotMode.DETERMINISTIC_DEMO
    assert "2,650.00" in response.reply or "2650" in response.reply
    assert "Stratos Dynamics" in response.reply


def test_copilot_chat_general_query(copilot_session):
    service = CopilotService(db=copilot_session, api_key="")
    response = service.chat(prompt="Give me a general status overview")

    assert response.mode == CopilotMode.DETERMINISTIC_DEMO
    assert "Settled revenue" in response.reply


def test_copilot_mode_with_api_key(copilot_session):
    service = CopilotService(db=copilot_session, api_key="sk-test-live-key")
    assert service.mode == CopilotMode.LIVE_AI
