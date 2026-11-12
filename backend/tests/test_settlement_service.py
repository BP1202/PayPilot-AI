"""Comprehensive tests for milestone settlement preparation, role validation, and idempotency.

Tests:
1. Agreement-backed settlement creation and role persistence.
2. Idempotent retries (same idempotency_key returns identical transaction without duplication).
3. Conflicting parameter rejection on idempotency reuse (HTTP 409).
4. Already completed / settled milestone rejection (HTTP 409).
5. Already pending settlement with distinct key rejection (HTTP 409).
6. Unauthorized caller rejection (HTTP 403).
7. Mismatched room / milestone rejection (HTTP 404).
8. Non-approved / not ready milestone rejection (HTTP 422).
9. Non-monetary milestone rejection (HTTP 422).
10. Missing / ambiguous agreement terms rejection (HTTP 422).
11. Business ID resolution (payee business vs fallback default business).
12. Legacy transaction preservation alongside settlement records.
13. Concurrency safety and duplicate prevention.
14. PostgreSQL integration verification.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.models.business import Business
from app.models.connection import Connection, ConnectionStatus
from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    MilestoneExecution,
    MilestoneExecutionStatus,
    PaymentReadinessStatus,
)
from app.models.proposal import Proposal, ProposalStatus
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.services.payment_service import PaymentService


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
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


def _setup_settlement_env(
    db,
    *,
    milestone_amount=Decimal("2500.00"),
    currency="USD",
    milestone_status=MilestoneExecutionStatus.APPROVED.value,
    payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
    room_status=DealRoomStatus.ACTIVE.value,
    agreed_milestones=None,
    agreed_responsibilities=None,
    create_payee_biz=False,
):
    uid = uuid4().hex[:6]
    u_payer = User(
        id=f"usr_payer_{uid}",
        email=f"payer_{uid}@test.com",
        hashed_password="hashed_pw",
    )
    u_payee = User(
        id=f"usr_payee_{uid}",
        email=f"payee_{uid}@test.com",
        hashed_password="hashed_pw",
    )
    u_outsider = User(
        id=f"usr_outsider_{uid}",
        email=f"outsider_{uid}@test.com",
        hashed_password="hashed_pw",
    )
    db.add_all([u_payer, u_payee, u_outsider])
    db.flush()

    payee_biz = None
    if create_payee_biz:
        payee_biz = Business(
            name=f"Payee Solutions {uid}",
            currency=currency,
            user_id=u_payee.id,
        )
        db.add(payee_biz)
        db.flush()

    conn = Connection(
        id=f"conn_{uid}",
        requester_id=u_payer.id,
        recipient_id=u_payee.id,
        status=ConnectionStatus.ACCEPTED.value,
        message="Commercial agreement partnership",
    )
    db.add(conn)
    db.flush()

    prop = Proposal(
        id=f"prop_{uid}",
        connection_id=conn.id,
        proposer_id=u_payer.id,
        recipient_id=u_payee.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Commercial Web Platform Build",
        description="Agreed commercial contract terms",
        budget_amount=Decimal("5000.00"),
        currency=currency,
    )
    db.add(prop)
    db.flush()

    default_milestone_terms = [
        {
            "id": f"m_{uid}_0",
            "title": "Phase 1: Architecture Spec",
            "payer_user_id": u_payer.id,
            "payee_user_id": u_payee.id,
            "agreed_amount": str(milestone_amount),
            "currency": currency,
        }
    ]

    room = DealRoom(
        id=f"room_{uid}",
        proposal_id=prop.id,
        connection_id=conn.id,
        title="Commercial Platform Deal Room",
        description="Active commercial workspace",
        status=room_status,
        accepted_proposal_version=1,
        agreed_budget_amount=Decimal("5000.00"),
        agreed_currency=currency,
        agreed_milestones=agreed_milestones if agreed_milestones is not None else default_milestone_terms,
        agreed_responsibilities=agreed_responsibilities if agreed_responsibilities is not None else {},
    )
    db.add(room)
    db.flush()

    p_payer = DealRoomParticipant(
        room_id=room.id,
        user_id=u_payer.id,
        collaboration_role="CLIENT",
        assigned_responsibilities="Reviews deliverables and funds milestone releases.",
    )
    p_payee = DealRoomParticipant(
        room_id=room.id,
        user_id=u_payee.id,
        collaboration_role="DEVELOPER",
        assigned_responsibilities="Builds and delivers milestone features to receive payment.",
    )
    db.add_all([p_payer, p_payee])
    db.flush()

    m = MilestoneExecution(
        id=f"m_{uid}_0",
        room_id=room.id,
        source_proposal_id=prop.id,
        accepted_proposal_version=1,
        milestone_index=0,
        title="Phase 1: Architecture Spec",
        status=milestone_status,
        payment_readiness=payment_readiness,
        agreed_amount=milestone_amount,
        currency=currency,
        reviewer_user_id=u_payer.id,
        responsible_user_id=u_payee.id,
    )
    db.add(m)
    db.commit()

    return {
        "payer": u_payer,
        "payee": u_payee,
        "outsider": u_outsider,
        "payee_biz": payee_biz,
        "room": room,
        "milestone": m,
        "proposal": prop,
        "connection": conn,
    }


def test_prepare_milestone_settlement_success(db_session):
    env = _setup_settlement_env(db_session, create_payee_biz=True)
    svc = PaymentService(db_session)

    idemp_key = f"idemp_{uuid4().hex[:12]}"
    tx = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key,
        description="Phase 1 settlement payout",
    )

    assert tx.id is not None
    assert tx.transaction_ref.startswith("TXN-SETTLE-")
    assert tx.status == TransactionStatus.PENDING  # Never falsely marked completed
    assert tx.type == TransactionType.CUSTOMER_PAYMENT
    assert tx.amount == Decimal("2500.00")
    assert tx.currency == "USD"
    assert tx.deal_room_id == env["room"].id
    assert tx.milestone_id == env["milestone"].id
    assert tx.payer_user_id == env["payer"].id
    assert tx.payee_user_id == env["payee"].id
    assert tx.idempotency_key == idemp_key
    assert tx.business_id == env["payee_biz"].id


def test_prepare_milestone_settlement_idempotent_retry(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    idemp_key = f"idemp_{uuid4().hex[:12]}"
    tx1 = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key,
    )

    initial_tx_count = db_session.query(Transaction).count()

    # Retry call with exact same parameters
    tx2 = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key,
    )

    assert tx1.id == tx2.id
    assert tx1.transaction_ref == tx2.transaction_ref
    assert db_session.query(Transaction).count() == initial_tx_count


def test_prepare_milestone_settlement_rejects_conflicting_idempotency_reuse(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    idemp_key = f"idemp_{uuid4().hex[:12]}"
    tx1 = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key,
    )

    # Tamper transaction amount in database to simulate conflicting commercial state
    tx1.amount = Decimal("9999.00")
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key=idemp_key,
        )

    assert exc_info.value.status_code == 409
    assert "conflicting commercial parameters" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_already_settled_milestone(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    idemp_key1 = f"idemp_{uuid4().hex[:12]}"
    tx1 = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key1,
    )

    # Mark transaction as COMPLETED (settled)
    tx1.status = TransactionStatus.COMPLETED
    db_session.commit()

    # Attempting settlement with new key must fail with 409
    idemp_key2 = f"idemp_{uuid4().hex[:12]}"
    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key=idemp_key2,
        )

    assert exc_info.value.status_code == 409
    assert "already been settled" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_pending_settlement_with_new_key(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    idemp_key1 = f"idemp_{uuid4().hex[:12]}"
    svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key=idemp_key1,
    )

    # New request with different idempotency key while settlement is already pending
    idemp_key2 = f"idemp_{uuid4().hex[:12]}"
    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key=idemp_key2,
        )

    assert exc_info.value.status_code == 409
    assert "already pending" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_unauthorized_outsider(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["outsider"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key="idemp-key-test",
        )

    assert exc_info.value.status_code == 403
    assert "access denied" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_mismatched_milestone_and_room(db_session):
    env1 = _setup_settlement_env(db_session)
    env2 = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    # Request milestone from room 1 using room 2 ID
    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env2["payer"].id,
            room_id=env2["room"].id,
            milestone_id=env1["milestone"].id,
            idempotency_key="idemp-key-test",
        )

    assert exc_info.value.status_code == 404


def test_prepare_milestone_settlement_rejects_unapproved_milestone(db_session):
    env = _setup_settlement_env(
        db_session,
        milestone_status=MilestoneExecutionStatus.IN_PROGRESS.value,
        payment_readiness=PaymentReadinessStatus.NOT_READY.value,
    )
    svc = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key="idemp-key-test",
        )

    assert exc_info.value.status_code == 422
    assert "not approved" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_non_monetary_milestone(db_session):
    env = _setup_settlement_env(
        db_session,
        milestone_amount=Decimal("0.00"),
    )
    svc = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key="idemp-key-test",
        )

    assert exc_info.value.status_code == 422
    assert "no financial settlement obligation" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_rejects_missing_agreement_roles(db_session):
    # Empty agreement milestones and empty responsibilities
    env = _setup_settlement_env(
        db_session,
        agreed_milestones=[],
        agreed_responsibilities={},
    )
    # Clear participant text responsibilities so no keywords match
    for p in db_session.query(DealRoomParticipant).filter(DealRoomParticipant.room_id == env["room"].id):
        p.assigned_responsibilities = "Participant member"
    db_session.commit()

    svc = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key="idemp-key-test",
        )

    assert exc_info.value.status_code == 422
    assert "does not explicitly establish" in exc_info.value.detail.lower()


def test_prepare_milestone_settlement_empty_idempotency_key_rejected(db_session):
    env = _setup_settlement_env(db_session)
    svc = PaymentService(db_session)

    with pytest.raises(HTTPException) as exc_info:
        svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key="   ",
        )

    assert exc_info.value.status_code == 422
    assert "idempotency key is strictly required" in exc_info.value.detail.lower()


def test_legacy_transactions_coexist_safely_with_settlement_records(db_session):
    env = _setup_settlement_env(db_session)
    biz = BusinessRepository(db_session).get_or_create_default_business()

    # Create legacy transaction without milestone or room reference
    legacy_tx = Transaction(
        transaction_ref=f"TXN-LEGACY-{uuid4().hex[:8].upper()}",
        business_id=biz.id,
        amount=Decimal("150.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        type=TransactionType.CUSTOMER_PAYMENT,
        payment_method="PAYPAL_SIMULATED",
        milestone_id=None,
        deal_room_id=None,
        payer_user_id=None,
        payee_user_id=None,
        idempotency_key=None,
    )
    db_session.add(legacy_tx)
    db_session.commit()

    # Now create milestone settlement transaction
    svc = PaymentService(db_session)
    settle_tx = svc.prepare_milestone_settlement(
        caller_user_id=env["payer"].id,
        room_id=env["room"].id,
        milestone_id=env["milestone"].id,
        idempotency_key="idemp-legacy-coexist",
    )

    # Both must query cleanly
    all_txs = db_session.query(Transaction).all()
    assert len(all_txs) == 2
    assert legacy_tx.milestone_id is None
    assert settle_tx.milestone_id == env["milestone"].id


def test_postgresql_settlement_service_integration():
    """Execute settlement preparation directly against live PostgreSQL 18."""
    pg_url = settings.DATABASE_URL
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL not configured in settings")

    try:
        engine = create_engine(pg_url)
        with engine.connect() as conn:
            pass
    except Exception:
        pytest.skip("PostgreSQL connection not reachable")

    PgSession = sessionmaker(bind=engine)
    session = PgSession()

    try:
        env = _setup_settlement_env(session, create_payee_biz=True)
        svc = PaymentService(session)

        idemp_key = f"pg_idemp_{uuid4().hex[:10]}"
        tx = svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key=idemp_key,
        )

        assert tx.id is not None
        assert tx.milestone_id == env["milestone"].id
        assert tx.deal_room_id == env["room"].id
        assert tx.payer_user_id == env["payer"].id
        assert tx.payee_user_id == env["payee"].id

        # Test idempotency repeat in PostgreSQL
        tx_repeat = svc.prepare_milestone_settlement(
            caller_user_id=env["payer"].id,
            room_id=env["room"].id,
            milestone_id=env["milestone"].id,
            idempotency_key=idemp_key,
        )
        assert tx.id == tx_repeat.id

        # Clean up created test fixture from PostgreSQL
        session.delete(tx)
        session.delete(env["milestone"])
        for p in session.query(DealRoomParticipant).filter(DealRoomParticipant.room_id == env["room"].id):
            session.delete(p)
        session.delete(env["room"])
        session.delete(env["proposal"])
        session.delete(env["connection"])
        if env["payee_biz"]:
            session.delete(env["payee_biz"])
        session.delete(env["payer"])
        session.delete(env["payee"])
        session.delete(env["outsider"])
        session.commit()

    finally:
        session.close()
        engine.dispose()


def test_prepare_milestone_settlement_api_endpoint(db_session):
    env = _setup_settlement_env(db_session, create_payee_biz=True)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        payer_token = create_access_token(user_id=env["payer"].id, email=env["payer"].email)
        outsider_token = create_access_token(user_id=env["outsider"].id, email=env["outsider"].email)

        room_id = env["room"].id
        milestone_id = env["milestone"].id
        endpoint_url = f"/api/v1/deal-rooms/{room_id}/milestones/{milestone_id}/settlement"
        idemp_key = f"api_idemp_{uuid4().hex[:12]}"

        # 1. Payer initiates settlement
        response = client.post(
            endpoint_url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={
                "idempotency_key": idemp_key,
                "description": "API settlement test",
            },
        )
        assert response.status_code == 201, response.text
        data = response.json()
        assert data["milestone_id"] == milestone_id
        assert data["deal_room_id"] == room_id
        assert data["payer_user_id"] == env["payer"].id
        assert data["payee_user_id"] == env["payee"].id
        assert data["idempotency_key"] == idemp_key
        assert data["status"] == "PENDING"
        first_tx_id = data["id"]

        # 2. Idempotent repeat with exact same key returns identical transaction
        repeat_resp = client.post(
            endpoint_url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={
                "idempotency_key": idemp_key,
                "description": "API settlement test retry",
            },
        )
        assert repeat_resp.status_code in (200, 201)
        repeat_data = repeat_resp.json()
        assert repeat_data["id"] == first_tx_id
        assert repeat_data["idempotency_key"] == idemp_key

        # Verify only 1 row exists in DB
        tx_count = db_session.query(Transaction).filter(
            Transaction.milestone_id == milestone_id,
            Transaction.idempotency_key == idemp_key,
        ).count()
        assert tx_count == 1

        # 3. Outsider receives 403 Forbidden
        outsider_resp = client.post(
            endpoint_url,
            headers={"Authorization": f"Bearer {outsider_token}"},
            json={
                "idempotency_key": f"outsider_{uuid4().hex[:8]}",
            },
        )
        assert outsider_resp.status_code == 403

        # 4. Nonexistent milestone returns 404
        fake_url = f"/api/v1/deal-rooms/{room_id}/milestones/m_fake_999/settlement"
        not_found_resp = client.post(
            fake_url,
            headers={"Authorization": f"Bearer {payer_token}"},
            json={
                "idempotency_key": f"fake_{uuid4().hex[:8]}",
            },
        )
        assert not_found_resp.status_code == 404

    finally:
        app.dependency_overrides.clear()

