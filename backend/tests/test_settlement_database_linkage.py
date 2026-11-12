"""Database constraint and relationship tests for milestone settlement linkages.

Validates:
- Valid persistence of settlement-linked transactions.
- Nullable fields for legacy transactions.
- Unique constraints on paypal_order_id and paypal_capture_id.
- Composite unique constraint on (milestone_id, idempotency_key).
- Multiple legacy transactions with NULL milestone_id remain supported without collision.
- Relationship traversal between MilestoneExecution, Transaction, DealRoom, and Users.
- Verification on PostgreSQL when available.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from app.core.config import settings
from app.core.database import Base
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
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def sqlite_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def _setup_settlement_fixture(db):
    uid_suffix = uuid4().hex[:6]
    biz = Business(
        name=f"Test Manufacturing {uid_suffix}",
        currency="USD",
    )
    u_payer = User(
        id=f"usr_payer_{uid_suffix}",
        email=f"payer_{uid_suffix}@test.com",
        hashed_password="pw",
    )
    u_payee = User(
        id=f"usr_payee_{uid_suffix}",
        email=f"payee_{uid_suffix}@test.com",
        hashed_password="pw",
    )
    db.add_all([biz, u_payer, u_payee])
    db.flush()

    conn = Connection(
        id=f"conn_{uid_suffix}",
        requester_id=u_payer.id,
        recipient_id=u_payee.id,
        status=ConnectionStatus.ACCEPTED.value,
        message="Commercial agreement collaboration",
    )
    db.add(conn)
    db.flush()

    prop = Proposal(
        id=f"prop_{uid_suffix}",
        connection_id=conn.id,
        proposer_id=u_payer.id,
        recipient_id=u_payee.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Agreement Proposal",
        description="Agreed commercial terms",
        budget_amount=Decimal("4000.00"),
        currency="USD",
    )
    db.add(prop)
    db.flush()

    room = DealRoom(
        id=f"room_{uid_suffix}",
        proposal_id=prop.id,
        connection_id=conn.id,
        title="Settlement Deal Room",
        description="Active room",
        status=DealRoomStatus.ACTIVE.value,
        accepted_proposal_version=1,
        agreed_budget_amount=Decimal("4000.00"),
        agreed_currency="USD",
    )
    db.add(room)
    db.flush()

    p1 = DealRoomParticipant(
        id=f"part_1_{uid_suffix}",
        room_id=room.id,
        user_id=u_payer.id,
        collaboration_role="Client Payer",
        assigned_responsibilities="Funding milestone payments",
    )
    p2 = DealRoomParticipant(
        id=f"part_2_{uid_suffix}",
        room_id=room.id,
        user_id=u_payee.id,
        collaboration_role="Contractor Payee",
        assigned_responsibilities="Service provider delivering features",
    )
    db.add_all([p1, p2])
    db.flush()

    m1 = MilestoneExecution(
        id=f"mil_1_{uid_suffix}",
        room_id=room.id,
        source_proposal_id=prop.id,
        accepted_proposal_version=1,
        milestone_index=0,
        title="Milestone 1",
        agreed_amount=Decimal("2000.00"),
        currency="USD",
        responsible_user_id=u_payee.id,
        reviewer_user_id=u_payer.id,
        status=MilestoneExecutionStatus.APPROVED.value,
        payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
    )
    m2 = MilestoneExecution(
        id=f"mil_2_{uid_suffix}",
        room_id=room.id,
        source_proposal_id=prop.id,
        accepted_proposal_version=1,
        milestone_index=1,
        title="Milestone 2",
        agreed_amount=Decimal("2000.00"),
        currency="USD",
        responsible_user_id=u_payee.id,
        reviewer_user_id=u_payer.id,
        status=MilestoneExecutionStatus.APPROVED.value,
        payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
    )
    db.add_all([m1, m2])
    db.commit()

    return {
        "biz": biz,
        "payer": u_payer,
        "payee": u_payee,
        "room": room,
        "m1": m1,
        "m2": m2,
    }


def test_milestone_settlement_transaction_persistence_and_relationships(sqlite_session):
    """Verify settlement fields are persisted and relationships can be traversed bi-directionally."""
    fix = _setup_settlement_fixture(sqlite_session)
    tx_ref = f"TXN-{uuid4().hex[:10].upper()}"

    tx = Transaction(
        transaction_ref=tx_ref,
        business_id=fix["biz"].id,
        milestone_id=fix["m1"].id,
        deal_room_id=fix["room"].id,
        payer_user_id=fix["payer"].id,
        payee_user_id=fix["payee"].id,
        paypal_order_id="ORD-TEST-12345",
        paypal_capture_id="CAP-TEST-12345",
        idempotency_key="idemp-key-001",
        amount=Decimal("2000.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        type=TransactionType.CUSTOMER_PAYMENT,
    )
    sqlite_session.add(tx)
    sqlite_session.commit()

    # Query transaction and check relationships
    reloaded_tx = (
        sqlite_session.query(Transaction)
        .filter(Transaction.transaction_ref == tx_ref)
        .first()
    )
    assert reloaded_tx is not None
    assert reloaded_tx.milestone_id == fix["m1"].id
    assert reloaded_tx.deal_room_id == fix["room"].id
    assert reloaded_tx.payer_user_id == fix["payer"].id
    assert reloaded_tx.payee_user_id == fix["payee"].id
    assert reloaded_tx.paypal_order_id == "ORD-TEST-12345"
    assert reloaded_tx.paypal_capture_id == "CAP-TEST-12345"
    assert reloaded_tx.idempotency_key == "idemp-key-001"

    # Relationship traversal
    assert reloaded_tx.milestone.id == fix["m1"].id
    assert reloaded_tx.deal_room.id == fix["room"].id
    assert reloaded_tx.payer.id == fix["payer"].id
    assert reloaded_tx.payee.id == fix["payee"].id

    # Inverse relationship from milestone
    reloaded_m1 = (
        sqlite_session.query(MilestoneExecution)
        .filter(MilestoneExecution.id == fix["m1"].id)
        .first()
    )
    assert len(reloaded_m1.transactions) == 1
    assert reloaded_m1.transactions[0].transaction_ref == tx_ref


def test_legacy_transaction_compatibility_with_null_settlement_fields(sqlite_session):
    """Verify legacy transactions without milestone/room references persist cleanly."""
    fix = _setup_settlement_fixture(sqlite_session)
    tx_ref_1 = f"TXN-LEGACY-{uuid4().hex[:8].upper()}"
    tx_ref_2 = f"TXN-LEGACY-{uuid4().hex[:8].upper()}"

    # Multiple legacy transactions with NULL milestone_id and NULL idempotency_key
    tx1 = Transaction(
        transaction_ref=tx_ref_1,
        business_id=fix["biz"].id,
        amount=Decimal("350.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        type=TransactionType.CUSTOMER_PAYMENT,
    )
    tx2 = Transaction(
        transaction_ref=tx_ref_2,
        business_id=fix["biz"].id,
        amount=Decimal("450.00"),
        currency="USD",
        status=TransactionStatus.COMPLETED,
        type=TransactionType.CUSTOMER_PAYMENT,
    )
    sqlite_session.add_all([tx1, tx2])
    sqlite_session.commit()

    reloaded_1 = (
        sqlite_session.query(Transaction)
        .filter(Transaction.transaction_ref == tx_ref_1)
        .first()
    )
    assert reloaded_1.milestone_id is None
    assert reloaded_1.deal_room_id is None
    assert reloaded_1.payer_user_id is None
    assert reloaded_1.payee_user_id is None
    assert reloaded_1.paypal_order_id is None
    assert reloaded_1.idempotency_key is None
    assert reloaded_1.milestone is None


def test_unique_paypal_order_id_constraint(sqlite_session):
    """Duplicate paypal_order_id must violate unique constraint."""
    fix = _setup_settlement_fixture(sqlite_session)
    tx1 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        paypal_order_id="ORD-DUPLICATE-CHECK",
        amount=Decimal("100.00"),
        currency="USD",
    )
    sqlite_session.add(tx1)
    sqlite_session.commit()

    tx2 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        paypal_order_id="ORD-DUPLICATE-CHECK",
        amount=Decimal("200.00"),
        currency="USD",
    )
    sqlite_session.add(tx2)
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    sqlite_session.rollback()


def test_unique_paypal_capture_id_constraint(sqlite_session):
    """Duplicate paypal_capture_id must violate unique constraint."""
    fix = _setup_settlement_fixture(sqlite_session)
    tx1 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        paypal_capture_id="CAP-DUPLICATE-CHECK",
        amount=Decimal("100.00"),
        currency="USD",
    )
    sqlite_session.add(tx1)
    sqlite_session.commit()

    tx2 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        paypal_capture_id="CAP-DUPLICATE-CHECK",
        amount=Decimal("200.00"),
        currency="USD",
    )
    sqlite_session.add(tx2)
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    sqlite_session.rollback()


def test_composite_unique_milestone_idempotency_constraint(sqlite_session):
    """Duplicate (milestone_id, idempotency_key) must violate composite constraint."""
    fix = _setup_settlement_fixture(sqlite_session)
    tx1 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        milestone_id=fix["m1"].id,
        idempotency_key="idemp-key-duplicate",
        amount=Decimal("500.00"),
        currency="USD",
    )
    sqlite_session.add(tx1)
    sqlite_session.commit()

    # Same milestone, same idempotency key must fail
    tx2 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        milestone_id=fix["m1"].id,
        idempotency_key="idemp-key-duplicate",
        amount=Decimal("500.00"),
        currency="USD",
    )
    sqlite_session.add(tx2)
    with pytest.raises(IntegrityError):
        sqlite_session.commit()
    sqlite_session.rollback()

    # Different milestone with same idempotency key should succeed
    tx3 = Transaction(
        transaction_ref=f"TXN-{uuid4().hex[:10].upper()}",
        business_id=fix["biz"].id,
        milestone_id=fix["m2"].id,
        idempotency_key="idemp-key-duplicate",
        amount=Decimal("500.00"),
        currency="USD",
    )
    sqlite_session.add(tx3)
    sqlite_session.commit()
    assert tx3.id is not None


def test_postgresql_constraint_enforcement():
    """
    Directly verify constraint enforcement on PostgreSQL database.
    Tests PostgreSQL composite uniqueness, PayPal ID uniqueness, and NULL compatibility.
    """
    pg_url = settings.DATABASE_URL
    if not pg_url.startswith("postgresql"):
        pytest.skip("PostgreSQL is not configured in settings")

    try:
        pg_engine = create_engine(pg_url, connect_args={"connect_timeout": 3})
        with pg_engine.connect():
            pass
    except (SQLAlchemyError, OSError):
        pytest.skip(
            "PostgreSQL connection not reachable in current execution environment"
        )

    PgSession = sessionmaker(bind=pg_engine)
    session = PgSession()

    try:
        fix = _setup_settlement_fixture(session)

        idemp_key = f"pg_idemp_{uuid4().hex[:8]}"
        order_id = f"ORD-PG-{uuid4().hex[:8]}"
        capture_id = f"CAP-PG-{uuid4().hex[:8]}"

        tx1 = Transaction(
            transaction_ref=f"TXN-PG-{uuid4().hex[:8].upper()}",
            business_id=fix["biz"].id,
            milestone_id=fix["m1"].id,
            deal_room_id=fix["room"].id,
            payer_user_id=fix["payer"].id,
            payee_user_id=fix["payee"].id,
            idempotency_key=idemp_key,
            paypal_order_id=order_id,
            paypal_capture_id=capture_id,
            amount=Decimal("1250.00"),
            currency="USD",
        )
        session.add(tx1)
        session.commit()

        # 1. Test duplicate (milestone_id, idempotency_key) in PostgreSQL
        dup_tx = Transaction(
            transaction_ref=f"TXN-PG-{uuid4().hex[:8].upper()}",
            business_id=fix["biz"].id,
            milestone_id=fix["m1"].id,
            idempotency_key=idemp_key,
            amount=Decimal("1250.00"),
            currency="USD",
        )
        session.add(dup_tx)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        # 2. Test duplicate paypal_order_id in PostgreSQL
        dup_ord_tx = Transaction(
            transaction_ref=f"TXN-PG-{uuid4().hex[:8].upper()}",
            business_id=fix["biz"].id,
            paypal_order_id=order_id,
            amount=Decimal("1250.00"),
            currency="USD",
        )
        session.add(dup_ord_tx)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        # 3. Test multiple NULL milestone_id rows in PostgreSQL (legacy compatibility)
        legacy_tx1 = Transaction(
            transaction_ref=f"TXN-PG-NULL-1-{uuid4().hex[:8].upper()}",
            business_id=fix["biz"].id,
            milestone_id=None,
            idempotency_key=None,
            amount=Decimal("100.00"),
            currency="USD",
        )
        legacy_tx2 = Transaction(
            transaction_ref=f"TXN-PG-NULL-2-{uuid4().hex[:8].upper()}",
            business_id=fix["biz"].id,
            milestone_id=None,
            idempotency_key=None,
            amount=Decimal("200.00"),
            currency="USD",
        )
        session.add_all([legacy_tx1, legacy_tx2])
        session.commit()
        assert legacy_tx1.id is not None
        assert legacy_tx2.id is not None

        # Clean up test transactions and fixture from PostgreSQL
        session.delete(tx1)
        session.delete(legacy_tx1)
        session.delete(legacy_tx2)
        session.delete(fix["m1"])
        session.delete(fix["m2"])
        session.delete(fix["room"])
        session.commit()

    finally:
        session.close()
        pg_engine.dispose()
