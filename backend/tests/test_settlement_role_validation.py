"""Focused unit tests for agreement-backed commercial settlement role validation.

Tests verify:
- Authoritative agreement-backed role derivation across explicit milestone terms,
  room agreed responsibilities, and participant contractual duties.
- Safe rejection (HTTP 422) for missing, ambiguous, conflicting, non-monetary, or self-settling roles.
- Caller authorization enforcement (HTTP 403).
- Prohibition against fallback users, untrusted payloads, and proposal creator assumptions.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from app.core.database import Base
from app.models.connection import Connection, ConnectionStatus
from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    MilestoneExecution,
    MilestoneExecutionStatus,
    PaymentReadinessStatus,
)
from app.models.proposal import Proposal, ProposalStatus
from app.models.user import User
from app.services.settlement_role_validator import (
    SettlementRoleValidator,
    ValidatedSettlementRoles,
)
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def db_session():
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


def _create_test_fixture(
    db,
    *,
    room_status=DealRoomStatus.ACTIVE.value,
    agreed_milestones=None,
    agreed_responsibilities=None,
    participant1_resp="Development and delivery",
    participant2_resp="Testing and client review",
    milestone_status=MilestoneExecutionStatus.APPROVED.value,
    payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
    agreed_amount=Decimal("1500.00"),
    currency="USD",
    worker_user_id=None,
    reviewer_user_id=None,
):
    uid_suffix = uuid4().hex[:6]
    u1 = User(
        id=f"usr_contractor_{uid_suffix}",
        email=f"contractor_{uid_suffix}@test.com",
        hashed_password="pw",
    )
    u2 = User(
        id=f"usr_client_{uid_suffix}",
        email=f"client_{uid_suffix}@test.com",
        hashed_password="pw",
    )
    u_outsider = User(
        id=f"usr_outsider_{uid_suffix}",
        email=f"outsider_{uid_suffix}@test.com",
        hashed_password="pw",
    )
    db.add_all([u1, u2, u_outsider])
    db.flush()

    conn = Connection(
        id=f"conn_{uid_suffix}",
        requester_id=u1.id,
        recipient_id=u2.id,
        status=ConnectionStatus.ACCEPTED.value,
        message="Let's collaborate on commercial agreement",
    )
    db.add(conn)
    db.flush()

    prop = Proposal(
        id=f"prop_{uid_suffix}",
        connection_id=conn.id,
        proposer_id=u1.id,
        recipient_id=u2.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Payment Test Proposal",
        description="Agreed commercial contract",
        budget_amount=Decimal("5000.00"),
        currency=currency,
    )
    db.add(prop)
    db.flush()

    room = DealRoom(
        id=f"room_{uid_suffix}",
        proposal_id=prop.id,
        connection_id=conn.id,
        title="Commercial Deal Room",
        description="Active workspace",
        status=room_status,
        accepted_proposal_version=1,
        agreed_budget_amount=Decimal("5000.00"),
        agreed_currency=currency,
        agreed_milestones=agreed_milestones if agreed_milestones is not None else [],
        agreed_responsibilities=agreed_responsibilities
        if agreed_responsibilities is not None
        else {},
    )
    db.add(room)
    db.flush()

    p1 = DealRoomParticipant(
        id=f"part_1_{uid_suffix}",
        room_id=room.id,
        user_id=u1.id,
        collaboration_role="Contractor",
        assigned_responsibilities=participant1_resp,
    )
    p2 = DealRoomParticipant(
        id=f"part_2_{uid_suffix}",
        room_id=room.id,
        user_id=u2.id,
        collaboration_role="Client",
        assigned_responsibilities=participant2_resp,
    )
    db.add_all([p1, p2])
    db.flush()

    actual_worker = worker_user_id or u1.id
    actual_reviewer = reviewer_user_id or u2.id

    milestone = MilestoneExecution(
        id=f"mil_{uid_suffix}",
        room_id=room.id,
        source_proposal_id=prop.id,
        accepted_proposal_version=1,
        milestone_index=0,
        title="Milestone 1: Backend API",
        agreed_amount=agreed_amount,
        currency=currency,
        responsible_user_id=actual_worker,
        reviewer_user_id=actual_reviewer,
        status=milestone_status,
        payment_readiness=payment_readiness,
    )
    db.add(milestone)
    db.commit()

    return {
        "room": room,
        "milestone": milestone,
        "contractor": u1,
        "client": u2,
        "outsider": u_outsider,
        "proposal": prop,
    }


def test_validate_settlement_roles_explicit_milestone_success(db_session):
    """Level 1: Payer and payee explicitly configured in agreed_milestones snapshot."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        participant1_resp="Development and delivery",
        participant2_resp="Testing and client review",
    )

    # Set explicit milestone-level configuration with actual participant IDs
    fix["room"].agreed_milestones = [
        {
            "id": fix["milestone"].id,
            "title": fix["milestone"].title,
            "payer_id": fix["client"].id,
            "payee_id": fix["contractor"].id,
        }
    ]
    db_session.commit()

    result = validator.validate_settlement_roles(
        db_session,
        caller_user_id=fix["client"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
    )

    assert isinstance(result, ValidatedSettlementRoles)
    assert result.payer_user_id == fix["client"].id
    assert result.payee_user_id == fix["contractor"].id
    assert result.agreed_amount == Decimal("1500.00")
    assert result.currency == "USD"
    assert result.resolution_source == "EXPLICIT_MILESTONE_SNAPSHOT"


def test_validate_settlement_roles_agreed_responsibilities_mapping(db_session):
    """Level 2: Payer and payee explicitly configured in room.agreed_responsibilities."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        participant1_resp="Development and delivery",
        participant2_resp="Testing and client review",
    )

    # Set explicit room-level responsibilities mapping with actual participant IDs
    fix["room"].agreed_responsibilities = {
        "client_id": fix["client"].id,
        "contractor_id": fix["contractor"].id,
    }
    db_session.commit()

    result = validator.validate_settlement_roles(
        db_session,
        caller_user_id=fix["contractor"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
    )

    assert result.payer_user_id == fix["client"].id
    assert result.payee_user_id == fix["contractor"].id
    assert result.resolution_source == "EXPLICIT_AGREED_RESPONSIBILITIES"


def test_validate_settlement_roles_unambiguous_participant_duties(db_session):
    """Level 3: Participant assigned contractual duties explicitly define payer and payee."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        participant1_resp="Full-stack engineering contractor delivering features",
        participant2_resp="Client funder responsible for funding milestone payments upon approval",
    )

    result = validator.validate_settlement_roles(
        db_session,
        caller_user_id=fix["client"].id,
        room_id=fix["room"].id,
        milestone_id=fix["milestone"].id,
    )

    assert result.payer_user_id == fix["client"].id
    assert result.payee_user_id == fix["contractor"].id
    assert result.resolution_source == "UNAMBIGUOUS_PARTICIPANT_RESPONSIBILITIES"


def test_validate_settlement_roles_unauthorized_caller(db_session):
    """Non-participant caller must receive HTTP 403 Forbidden."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        participant1_resp="Contractor deliverable lead",
        participant2_resp="Client paying milestone fees",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["outsider"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 403
    assert "Access denied" in exc_info.value.detail


def test_validate_settlement_roles_inactive_room(db_session):
    """Non-active Deal Room must fail with HTTP 422."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        room_status=DealRoomStatus.ON_HOLD.value,
        participant1_resp="Contractor deliverable lead",
        participant2_resp="Client paying milestone fees",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "not active" in exc_info.value.detail


def test_validate_settlement_roles_unapproved_milestone(db_session):
    """Unapproved milestone must fail with HTTP 422."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        milestone_status=MilestoneExecutionStatus.IN_PROGRESS.value,
        payment_readiness=PaymentReadinessStatus.NOT_READY.value,
        participant1_resp="Contractor deliverable lead",
        participant2_resp="Client paying milestone fees",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "not approved" in exc_info.value.detail


def test_validate_settlement_roles_readiness_not_ready(db_session):
    """Approved milestone whose payment readiness is not ready must fail with HTTP 422."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        milestone_status=MilestoneExecutionStatus.APPROVED.value,
        payment_readiness=PaymentReadinessStatus.NOT_READY.value,
        participant1_resp="Contractor deliverable lead",
        participant2_resp="Client paying milestone fees",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "READY_FOR_PAYMENT_REVIEW" in exc_info.value.detail


def test_validate_settlement_roles_non_monetary_milestone(db_session):
    """Milestone with 0 agreed amount has no settlement obligation and must fail with HTTP 422."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        agreed_amount=Decimal("0.00"),
        participant1_resp="Contractor deliverable lead",
        participant2_resp="Client paying milestone fees",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "no financial settlement obligation" in exc_info.value.detail


def test_validate_settlement_roles_missing_agreement_terms_fails_safely(db_session):
    """Ambiguous responsibilities with no explicit payment assignment must fail safely (no fallback)."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        agreed_milestones=[],
        agreed_responsibilities={},
        participant1_resp="Backend architecture design",
        participant2_resp="Frontend UX review and QA",
    )

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "does not explicitly establish the commercial payer" in exc_info.value.detail


def test_validate_settlement_roles_conflicting_roles_fail(db_session):
    """Agreement specifying reversed payer/payee compared to milestone worker/reviewer must fail with HTTP 422."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(
        db_session,
        participant1_resp="Backend developer",
        participant2_resp="Product tester",
    )

    # Invert the agreement: declare client as payee and contractor as payer
    fix["room"].agreed_responsibilities = {
        "payer_id": fix["contractor"].id,
        "payee_id": fix["client"].id,
    }
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "Conflicting role assignment" in exc_info.value.detail


def test_validate_settlement_roles_non_participant_in_agreement_fails(db_session):
    """Agreement referencing an outsider who is not an active participant must fail safely."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(db_session)

    fix["room"].agreed_responsibilities = {
        "payer_id": fix["outsider"].id,
        "payee_id": fix["contractor"].id,
    }
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["contractor"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "not an active participant" in exc_info.value.detail


def test_validate_settlement_roles_self_settlement_fails(db_session):
    """Payer and payee resolving to the same user must be rejected."""
    validator = SettlementRoleValidator()
    fix = _create_test_fixture(db_session)

    fix["room"].agreed_responsibilities = {
        "payer_id": fix["client"].id,
        "payee_id": fix["client"].id,
    }
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        validator.validate_settlement_roles(
            db_session,
            caller_user_id=fix["client"].id,
            room_id=fix["room"].id,
            milestone_id=fix["milestone"].id,
        )

    assert exc_info.value.status_code == 422
    assert "Self-settlement is not supported" in exc_info.value.detail
