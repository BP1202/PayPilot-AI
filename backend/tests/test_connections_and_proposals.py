"""Tests for the Connections & Proposals module.

Uses in-memory SQLite via SQLAlchemy (same pattern as test_matchmaking.py).
Covers: connection lifecycle, proposal lifecycle, auth enforcement,
Decimal budget precision, state machine transitions.
"""

from datetime import UTC, datetime
from decimal import Decimal

import pytest
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.connection import Connection, ConnectionStatus
from app.models.opportunity import (
    Opportunity,
    OpportunityCategory,
    OpportunityIntent,
    OpportunityStatus,
    OpportunityType,
    OpportunityVisibility,
)
from app.models.user import User
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def make_accepted_connection(
    db: Session,
    requester_id: str,
    recipient_id: str,
    conn_id: str = "conn_test001",
) -> Connection:
    conn = Connection(
        id=conn_id,
        requester_id=requester_id,
        recipient_id=recipient_id,
        status=ConnectionStatus.ACCEPTED.value,
        intent="EXPLORE_COLLABORATION",
        message="Let's collaborate!",
        accepted_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def make_pending_connection(
    db: Session,
    requester_id: str,
    recipient_id: str,
    conn_id: str = "conn_pending01",
) -> Connection:
    conn = Connection(
        id=conn_id,
        requester_id=requester_id,
        recipient_id=recipient_id,
        status=ConnectionStatus.PENDING.value,
        intent="EXPLORE_COLLABORATION",
        message="Interested in your opportunity!",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def create_test_opportunity(
    db: Session,
    opp_id: str,
    user_id: str,
    title: str = "Test Opportunity",
    visibility: OpportunityVisibility = OpportunityVisibility.PUBLIC,
) -> Opportunity:
    opp = Opportunity(
        id=opp_id,
        user_id=user_id,
        title=title,
        original_description="A great opportunity.",
        submission_type=OpportunityType.IDEA.value,
        intent=OpportunityIntent.SEEKING_SOLUTION.value,
        category=OpportunityCategory.TECH.value,
        status=OpportunityStatus.PUBLISHED.value,
        visibility=visibility.value,
        published_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


AUTH_HEADER = lambda token: {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# CONNECTION TESTS
# ---------------------------------------------------------------------------


def test_connection_request_success(
    client_with_db: TestClient, test_db_session: Session
):
    """Successful connection request creation."""
    sender, sender_token = make_user(test_db_session, "u-sender", "sender@test.com")
    recipient, _ = make_user(test_db_session, "u-recip", "recip@test.com")

    resp = client_with_db.post(
        "/api/v1/connections/requests",
        json={
            "recipient_id": recipient.id,
            "intent": "EXPLORE_COLLABORATION",
            "message": "Hey, I'd love to collaborate with you on something interesting.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["requester"]["user_id"] == sender.id
    assert data["recipient"]["user_id"] == recipient.id
    assert data["intent"] == "EXPLORE_COLLABORATION"


def test_connection_request_via_base_path(
    client_with_db: TestClient, test_db_session: Session
):
    """Successful connection request creation via base /api/v1/connections path."""
    sender, sender_token = make_user(
        test_db_session, "u-sender-base", "sender_base@test.com"
    )
    recipient, _ = make_user(test_db_session, "u-recip-base", "recip_base@test.com")

    resp = client_with_db.post(
        "/api/v1/connections",
        json={
            "recipient_id": recipient.id,
            "intent": "EXPLORE_COLLABORATION",
            "message": "Connecting via base path to verify endpoint accessibility.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["requester"]["user_id"] == sender.id
    assert data["recipient"]["user_id"] == recipient.id


def test_connection_self_connection_blocked(
    client_with_db: TestClient, test_db_session: Session
):
    """HTTP 400 when requester == recipient."""
    user, token = make_user(test_db_session, "u-self", "self@test.com")

    resp = client_with_db.post(
        "/api/v1/connections/requests",
        json={
            "recipient_id": user.id,
            "message": "Sending to myself, should fail.",
        },
        headers=AUTH_HEADER(token),
    )
    assert resp.status_code == 400
    assert "yourself" in resp.json()["detail"].lower()


def test_connection_duplicate_pending_blocked(
    client_with_db: TestClient, test_db_session: Session
):
    """HTTP 409 when a PENDING connection already exists between same pair."""
    sender, sender_token = make_user(test_db_session, "u-dup-s", "dups@test.com")
    recipient, _ = make_user(test_db_session, "u-dup-r", "dupr@test.com")

    # Create first request
    make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    # Attempt duplicate
    resp = client_with_db.post(
        "/api/v1/connections/requests",
        json={
            "recipient_id": recipient.id,
            "message": "This is a duplicate request and should be rejected.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 409
    assert "pending" in resp.json()["detail"].lower()


def test_connection_accept(client_with_db: TestClient, test_db_session: Session):
    """Recipient accepts a pending connection — status becomes ACCEPTED."""
    sender, _ = make_user(test_db_session, "u-acc-s", "acc-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-acc-r", "acc-r@test.com")

    conn = make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    resp = client_with_db.post(
        f"/api/v1/connections/{conn.id}/respond",
        json={"action": "ACCEPT", "response_note": "Looking forward to it!"},
        headers=AUTH_HEADER(recip_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "ACCEPTED"
    assert data["response_note"] == "Looking forward to it!"
    assert data["accepted_at"] is not None


def test_connection_decline(client_with_db: TestClient, test_db_session: Session):
    """Recipient declines a pending connection — status becomes DECLINED."""
    sender, _ = make_user(test_db_session, "u-dec-s", "dec-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-dec-r", "dec-r@test.com")

    conn = make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    resp = client_with_db.post(
        f"/api/v1/connections/{conn.id}/respond",
        json={"action": "DECLINE"},
        headers=AUTH_HEADER(recip_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "DECLINED"
    assert data["declined_at"] is not None


def test_connection_withdraw(client_with_db: TestClient, test_db_session: Session):
    """Sender withdraws a pending connection — status becomes WITHDRAWN."""
    sender, sender_token = make_user(test_db_session, "u-with-s", "with-s@test.com")
    recipient, _ = make_user(test_db_session, "u-with-r", "with-r@test.com")

    conn = make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    resp = client_with_db.post(
        f"/api/v1/connections/{conn.id}/withdraw",
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["status"] == "WITHDRAWN"
    assert data["withdrawn_at"] is not None


def test_connection_list_incoming(client_with_db: TestClient, test_db_session: Session):
    """Incoming direction filter returns only requests where user is recipient."""
    sender_a, _ = make_user(test_db_session, "u-lst-a", "lst-a@test.com")
    sender_b, _ = make_user(test_db_session, "u-lst-b", "lst-b@test.com")
    recipient, recip_token = make_user(test_db_session, "u-lst-r", "lst-r@test.com")

    make_pending_connection(
        test_db_session,
        requester_id=sender_a.id,
        recipient_id=recipient.id,
        conn_id="conn_lst01",
    )
    make_pending_connection(
        test_db_session,
        requester_id=sender_b.id,
        recipient_id=recipient.id,
        conn_id="conn_lst02",
    )

    resp = client_with_db.get(
        "/api/v1/connections/requests?direction=incoming",
        headers=AUTH_HEADER(recip_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 2
    assert all(item["recipient"]["user_id"] == recipient.id for item in data["items"])


def test_connection_unauthorized(client_with_db: TestClient, test_db_session: Session):
    """HTTP 401 when no auth token is provided."""
    resp = client_with_db.post(
        "/api/v1/connections/requests",
        json={"recipient_id": "anyone", "message": "Hello there!"},
    )
    assert resp.status_code == 401
    assert "credentials" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# PROPOSAL TESTS
# ---------------------------------------------------------------------------


def test_proposal_requires_active_connection(
    client_with_db: TestClient, test_db_session: Session
):
    """HTTP 403 when attempting to create a proposal on a PENDING connection."""
    sender, sender_token = make_user(test_db_session, "u-prop-s", "prop-s@test.com")
    recipient, _ = make_user(test_db_session, "u-prop-r", "prop-r@test.com")

    conn = make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "My Great Proposal",
            "description": "This is a detailed description of the proposal.",
            "budget_amount": "1000.00",
            "currency": "USD",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 403
    assert "ACCEPTED" in resp.json()["detail"]


def test_proposal_creation_decimal_budget(
    client_with_db: TestClient, test_db_session: Session
):
    """Decimal budget is stored and returned correctly without float imprecision."""
    sender, sender_token = make_user(test_db_session, "u-dec-ps", "dec-ps@test.com")
    recipient, _ = make_user(test_db_session, "u-dec-pr", "dec-pr@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Decimal Budget Test Proposal",
            "description": "Testing that budget_amount is stored as Decimal, not float.",
            "budget_amount": "9999.99",
            "currency": "USD",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "SUBMITTED"
    assert data["current_version"] == 1
    # Verify precision — budget should come back as "9999.99"
    assert Decimal(data["budget_amount"]) == Decimal("9999.99")


def test_proposal_revision_preserves_history(
    client_with_db: TestClient, test_db_session: Session
):
    """After a revision, version increments and v1 snapshot is preserved in history."""
    sender, sender_token = make_user(test_db_session, "u-rev-s", "rev-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-rev-r", "rev-r@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    # Create proposal
    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Original Title",
            "description": "Original description.",
            "budget_amount": "500.00",
            "currency": "USD",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201, create_resp.text
    proposal_id = create_resp.json()["id"]

    # Recipient requests revision
    client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "REQUEST_REVISION", "note": "Please lower the budget."},
        headers=AUTH_HEADER(recip_token),
    )

    # Proposer submits revision
    rev_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/revisions",
        json={
            "change_summary": "Lowered budget as requested.",
            "title": "Revised Title",
            "budget_amount": "350.00",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert rev_resp.status_code == 200, rev_resp.text
    data = rev_resp.json()

    assert data["current_version"] == 2
    assert data["title"] == "Revised Title"
    assert Decimal(data["budget_amount"]) == Decimal("350.00")
    assert data["status"] == "SUBMITTED"

    # Revision history must contain version 1 snapshot
    assert len(data["revisions"]) >= 1
    v1_rev = next((r for r in data["revisions"] if r["version"] == 1), None)
    assert v1_rev is not None
    assert v1_rev["title"] == "Original Title"
    assert Decimal(v1_rev["budget_amount"]) == Decimal("500.00")


def test_proposal_accept(client_with_db: TestClient, test_db_session: Session):
    """Recipient accepts a SUBMITTED proposal — status becomes ACCEPTED."""
    sender, sender_token = make_user(test_db_session, "u-acc-ps", "acc-ps@test.com")
    recipient, recip_token = make_user(test_db_session, "u-acc-pr", "acc-pr@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Proposal to Accept",
            "description": "Please accept this proposal.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    accept_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "ACCEPT"},
        headers=AUTH_HEADER(recip_token),
    )
    assert accept_resp.status_code == 200, accept_resp.text
    data = accept_resp.json()
    assert data["status"] == "ACCEPTED"
    assert data["recipient_accepted_at"] is not None
    assert data["accepted_version"] == 1


def test_proposal_reject(client_with_db: TestClient, test_db_session: Session):
    """Recipient rejects a proposal with a reason — status becomes REJECTED."""
    sender, sender_token = make_user(test_db_session, "u-rej-s", "rej-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-rej-r", "rej-r@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Proposal to Reject",
            "description": "This will be rejected.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    rej_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "REJECT", "note": "Budget is too high."},
        headers=AUTH_HEADER(recip_token),
    )
    assert rej_resp.status_code == 200, rej_resp.text
    data = rej_resp.json()
    assert data["status"] == "REJECTED"
    assert data["rejection_reason"] == "Budget is too high."


def test_proposal_request_revision(
    client_with_db: TestClient, test_db_session: Session
):
    """Recipient requests a revision — status becomes REVISION_REQUESTED and note stored."""
    sender, sender_token = make_user(test_db_session, "u-reqrev-s", "reqrev-s@t.com")
    recipient, recip_token = make_user(test_db_session, "u-reqrev-r", "reqrev-r@t.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Proposal for Revision",
            "description": "Please revise this proposal.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    rev_req_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "REQUEST_REVISION", "note": "Please add more detail to scope."},
        headers=AUTH_HEADER(recip_token),
    )
    assert rev_req_resp.status_code == 200, rev_req_resp.text
    data = rev_req_resp.json()
    assert data["status"] == "REVISION_REQUESTED"
    assert data["revision_requested_note"] == "Please add more detail to scope."


def test_proposal_accepted_immutable(
    client_with_db: TestClient, test_db_session: Session
):
    """Cannot submit a revision while proposal is in ACCEPTED status."""
    sender, sender_token = make_user(test_db_session, "u-imm-s", "imm-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-imm-r", "imm-r@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    # Create and immediately accept a proposal
    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Proposal to Lock",
            "description": "This will be accepted and become immutable.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    # Accept it
    client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "ACCEPT"},
        headers=AUTH_HEADER(recip_token),
    )

    # Attempt revision on ACCEPTED proposal — must fail
    rev_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/revisions",
        json={
            "change_summary": "Trying to change an accepted proposal.",
            "title": "Sneaky update",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert rev_resp.status_code == 409
    assert "ACCEPTED" in rev_resp.json()["detail"]


def test_proposal_unauthorized(client_with_db: TestClient, test_db_session: Session):
    """HTTP 401 when no auth token is provided on proposals endpoint."""
    resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": "conn_xxx",
            "title": "No auth",
            "description": "Should fail with 401.",
        },
    )
    assert resp.status_code == 401
    assert "credentials" in resp.json()["detail"].lower()


def test_proposal_non_participant_cannot_withdraw(
    client_with_db: TestClient, test_db_session: Session
):
    """Non-participant cannot withdraw a proposal."""
    sender, sender_token = make_user(test_db_session, "u-np-s", "np-s@test.com")
    recipient, _ = make_user(test_db_session, "u-np-r", "np-r@test.com")
    _, outsider_token = make_user(test_db_session, "u-np-o", "np-o@test.com")

    conn = make_accepted_connection(
        test_db_session,
        requester_id=sender.id,
        recipient_id=recipient.id,
    )

    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Proposal for withdrawal test",
            "description": "Only sender or recipient can touch this.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    # Outsider tries to withdraw
    withdraw_resp = client_with_db.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "WITHDRAW"},
        headers=AUTH_HEADER(outsider_token),
    )
    assert withdraw_resp.status_code == 403


def test_connection_recipient_cannot_withdraw(
    client_with_db: TestClient, test_db_session: Session
):
    """Recipient cannot withdraw a connection request (only requester can)."""
    sender, _ = make_user(test_db_session, "u-rw-s", "rw-s@test.com")
    recipient, recip_token = make_user(test_db_session, "u-rw-r", "rw-r@test.com")

    conn = make_pending_connection(
        test_db_session, requester_id=sender.id, recipient_id=recipient.id
    )

    resp = client_with_db.post(
        f"/api/v1/connections/{conn.id}/withdraw",
        headers=AUTH_HEADER(recip_token),
    )
    assert resp.status_code == 403
    assert "requester" in resp.json()["detail"].lower()
