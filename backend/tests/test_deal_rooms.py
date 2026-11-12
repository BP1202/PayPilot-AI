"""Tests for the Deal Room module (Issue #8).

Uses in-memory SQLite via SQLAlchemy with StaticPool.
Covers:
- Deal room creation from accepted proposals
- Rejection of unaccepted proposals
- Idempotent room creation
- Strict participant authorization (403 for outsiders)
- Full lifecycle state machine transitions (ACTIVE, ON_HOLD, COMPLETION_REVIEW, COMPLETED, CANCELLED)
- Shared notes & pinned priority
- Clarifications Q&A lifecycle
- Document references & upload authorization (uploader-only deletion)
- Activity audit trail
- Grounded AI Deal Room Copilot with structured provenance badges
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


def make_accepted_connection(
    db: Session,
    requester_id: str,
    recipient_id: str,
    conn_id: str = "conn_dr_test",
) -> Connection:
    conn = Connection(
        id=conn_id,
        requester_id=requester_id,
        recipient_id=recipient_id,
        status=ConnectionStatus.ACCEPTED.value,
        intent="EXPLORE_COLLABORATION",
        message="Let's build a deal room!",
        accepted_at=datetime.now(UTC),
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
    title: str = "Deal Room Opp",
) -> Opportunity:
    opp = Opportunity(
        id=opp_id,
        user_id=user_id,
        title=title,
        original_description="An opportunity that turned into an agreement.",
        submission_type=OpportunityType.IDEA.value,
        intent=OpportunityIntent.SEEKING_SOLUTION.value,
        category=OpportunityCategory.TECH.value,
        status=OpportunityStatus.PUBLISHED.value,
        visibility=OpportunityVisibility.PUBLIC.value,
        published_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


AUTH_HEADER = lambda token: {"Authorization": f"Bearer {token}"}


def setup_accepted_proposal(client: TestClient, db: Session):
    sender, sender_token = make_user(
        db, "u-dr-sender", "dr-sender@test.com", "Alice Proposer"
    )
    recipient, recip_token = make_user(
        db, "u-dr-recip", "dr-recip@test.com", "Bob Counterpart"
    )
    outsider, outsider_token = make_user(
        db, "u-dr-outsider", "dr-outsider@test.com", "Eve Outsider"
    )

    conn = make_accepted_connection(db, sender.id, recipient.id)
    opp = create_test_opportunity(db, "opp-dr-001", sender.id)

    # Proposer creates proposal
    create_resp = client.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "opportunity_id": opp.id,
            "title": "Mobile App Engineering Agreement",
            "description": "Full native iOS and Android build.",
            "scope_of_work": "Design, implement, test, and release the mobile application.",
            "deliverables": ["Figma Prototype", "Backend APIs", "iOS/Android Apps"],
            "budget_amount": "12500.50",
            "currency": "USD",
            "estimated_duration_days": 45,
            "timeline_summary": "6-week agile sprint cycle.",
            "milestones": [
                {"title": "M1: Architecture & UI", "amount": 3500.00, "due_days": 14},
                {"title": "M2: Core Development", "amount": 6000.00, "due_days": 30},
                {
                    "title": "M3: Testing & Store Launch",
                    "amount": 3000.50,
                    "due_days": 45,
                },
            ],
            "responsibilities": {
                "proposer": "Architecture design and API implementation",
                "recipient": "Product requirements, testing, and feedback",
            },
            "assumptions": ["API specs finalized in week 1"],
            "conditions": ["Milestone approvals within 3 business days"],
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201, create_resp.text
    proposal_id = create_resp.json()["id"]

    # Recipient accepts proposal
    accept_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "ACCEPT"},
        headers=AUTH_HEADER(recip_token),
    )
    assert accept_resp.status_code == 200, accept_resp.text

    return {
        "sender": sender,
        "sender_token": sender_token,
        "recipient": recipient,
        "recip_token": recip_token,
        "outsider": outsider,
        "outsider_token": outsider_token,
        "proposal_id": proposal_id,
        "conn": conn,
        "opp": opp,
    }


def test_create_deal_room_success(client_with_db: TestClient, test_db_session: Session):
    """Deal Room initializes from accepted proposal with snapshot terms & participants."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)

    resp = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert resp.status_code == 201, resp.text
    room = resp.json()

    assert room["title"] == "Mobile App Engineering Agreement"
    assert room["status"] == "ACTIVE"
    assert room["accepted_proposal_version"] == 1
    assert Decimal(str(room["agreed_budget_amount"])) == Decimal("12500.50")
    assert room["agreed_currency"] == "USD"
    assert len(room["agreed_deliverables"]) == 3
    assert len(room["agreed_milestones"]) == 3
    assert len(room["participants"]) == 2

    # Check participant roles
    roles = {p["user_id"]: p["collaboration_role"] for p in room["participants"]}
    assert roles[ctx["sender"].id] == "Proposer / Initiator"
    assert roles[ctx["recipient"].id] == "Counterpart / Collaborator"


def test_create_deal_room_idempotent(
    client_with_db: TestClient, test_db_session: Session
):
    """Calling create on an existing room returns the existing record without duplicate error."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)

    # First call by sender
    resp1 = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert resp1.status_code == 201
    room_id = resp1.json()["id"]

    # Second call by recipient
    resp2 = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert resp2.status_code == 201
    assert resp2.json()["id"] == room_id


def test_create_deal_room_unaccepted_proposal_blocked(
    client_with_db: TestClient, test_db_session: Session
):
    """Cannot create Deal Room from a SUBMITTED or unaccepted proposal."""
    sender, sender_token = make_user(test_db_session, "u-unacc-s", "unacc-s@test.com")
    recipient, _ = make_user(test_db_session, "u-unacc-r", "unacc-r@test.com")
    conn = make_accepted_connection(
        test_db_session, sender.id, recipient.id, "conn_unacc"
    )

    create_resp = client_with_db.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "title": "Pending Proposal",
            "description": "Not accepted yet.",
        },
        headers=AUTH_HEADER(sender_token),
    )
    assert create_resp.status_code == 201
    proposal_id = create_resp.json()["id"]

    # Attempt Deal Room creation
    resp = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": proposal_id},
        headers=AUTH_HEADER(sender_token),
    )
    assert resp.status_code == 400
    assert "mutually accepted" in resp.json()["detail"]


def test_deal_room_participant_authorization(
    client_with_db: TestClient, test_db_session: Session
):
    """Non-participants are rejected with 403 on all workspace access."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)

    create_resp = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    room_id = create_resp.json()["id"]

    # Outsider attempt to view room -> 403
    resp = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}",
        headers=AUTH_HEADER(ctx["outsider_token"]),
    )
    assert resp.status_code == 403

    # Outsider attempt to view overview -> 403
    resp_overview = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/overview",
        headers=AUTH_HEADER(ctx["outsider_token"]),
    )
    assert resp_overview.status_code == 403

    # Authorized participant -> 200
    resp_auth = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}",
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert resp_auth.status_code == 200


def test_list_user_deal_rooms(client_with_db: TestClient, test_db_session: Session):
    """Participants see their rooms; outsiders see empty list."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)

    client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )

    # Sender lists rooms
    resp_s = client_with_db.get(
        "/api/v1/deal-rooms", headers=AUTH_HEADER(ctx["sender_token"])
    )
    assert resp_s.status_code == 200
    assert resp_s.json()["total"] == 1

    # Recipient lists rooms
    resp_r = client_with_db.get(
        "/api/v1/deal-rooms", headers=AUTH_HEADER(ctx["recip_token"])
    )
    assert resp_r.status_code == 200
    assert resp_r.json()["total"] == 1

    # Outsider lists rooms -> total 0
    resp_o = client_with_db.get(
        "/api/v1/deal-rooms", headers=AUTH_HEADER(ctx["outsider_token"])
    )
    assert resp_o.status_code == 200
    assert resp_o.json()["total"] == 0


def test_deal_room_lifecycle_transitions(
    client_with_db: TestClient, test_db_session: Session
):
    """Enforce state machine transitions: ACTIVE -> ON_HOLD -> ACTIVE -> COMPLETION_REVIEW -> COMPLETED."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)

    room_resp = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    room_id = room_resp.json()["id"]

    # 1. ACTIVE -> ON_HOLD without reason -> fails with 400
    hold_fail = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "ON_HOLD"},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert hold_fail.status_code == 400

    # 2. ACTIVE -> ON_HOLD with reason -> 200
    hold_ok = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "ON_HOLD", "reason": "Awaiting third-party API credentials."},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert hold_ok.status_code == 200
    assert hold_ok.json()["status"] == "ON_HOLD"
    assert hold_ok.json()["status_reason"] == "Awaiting third-party API credentials."

    # 3. ON_HOLD -> ACTIVE -> 200
    resume_ok = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "ACTIVE"},
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert resume_ok.status_code == 200
    assert resume_ok.json()["status"] == "ACTIVE"

    # 4. ACTIVE -> COMPLETION_REVIEW -> 200
    review_ok = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "COMPLETION_REVIEW"},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert review_ok.status_code == 200
    assert review_ok.json()["status"] == "COMPLETION_REVIEW"

    # 5. COMPLETION_REVIEW -> COMPLETED -> 200
    complete_ok = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "COMPLETED"},
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert complete_ok.status_code == 200
    assert complete_ok.json()["status"] == "COMPLETED"

    # 6. Cannot transition from COMPLETED -> ACTIVE (terminal state)
    invalid_post_complete = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/status",
        json={"status": "ACTIVE"},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert invalid_post_complete.status_code == 400


def test_deal_room_shared_notes(client_with_db: TestClient, test_db_session: Session):
    """Create notes, verify pinning sort priority and participant author attribution."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)
    room_id = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    ).json()["id"]

    # Note 1 (unpinned)
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/notes",
        json={
            "title": "Sprint 1 Setup",
            "content": "Initial repo setup instructions.",
            "is_pinned": False,
        },
        headers=AUTH_HEADER(ctx["sender_token"]),
    )

    # Note 2 (pinned)
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/notes",
        json={
            "title": "Important Guidelines",
            "content": "Always commit via branch PRs.",
            "is_pinned": True,
        },
        headers=AUTH_HEADER(ctx["recip_token"]),
    )

    # Fetch notes list
    resp = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/notes", headers=AUTH_HEADER(ctx["sender_token"])
    )
    assert resp.status_code == 200
    notes = resp.json()
    assert len(notes) == 2
    # Pinned note should be first
    assert notes[0]["is_pinned"] is True
    assert notes[0]["title"] == "Important Guidelines"
    assert notes[0]["author_id"] == ctx["recipient"].id


def test_deal_room_clarifications_qa(
    client_with_db: TestClient, test_db_session: Session
):
    """Ask a question, answer it, and verify resolution state."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)
    room_id = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    ).json()["id"]

    # Proposer asks clarification
    ask_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/clarifications",
        json={
            "question": "Should the push notifications support APNs directly or via Firebase FCM?"
        },
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert ask_resp.status_code == 201
    clar_id = ask_resp.json()["id"]
    assert ask_resp.json()["status"] == "OPEN"

    # Recipient answers
    ans_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/clarifications/{clar_id}/answer",
        json={
            "answer": "Firebase FCM is preferred for unified cross-platform handling."
        },
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert ans_resp.status_code == 200
    assert ans_resp.json()["status"] == "RESOLVED"
    assert ans_resp.json()["answered_by_id"] == ctx["recipient"].id
    assert ans_resp.json()["answered_at"] is not None


def test_deal_room_document_references(
    client_with_db: TestClient, test_db_session: Session
):
    """Attach document reference, prevent unauthorized deletion, allow uploader deletion."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)
    room_id = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    ).json()["id"]

    # Proposer attaches document
    doc_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/documents",
        json={
            "title": "API Specification v1.0",
            "document_type": "SPECIFICATION",
            "reference_url": "https://specs.example.com/api-v1",
            "description": "OpenAPI documentation for mobile endpoints.",
        },
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert doc_resp.status_code == 201
    doc_id = doc_resp.json()["id"]

    # Recipient tries to delete -> 403 Forbidden
    del_forbidden = client_with_db.delete(
        f"/api/v1/deal-rooms/{room_id}/documents/{doc_id}",
        headers=AUTH_HEADER(ctx["recip_token"]),
    )
    assert del_forbidden.status_code == 403

    # Proposer deletes -> 204 No Content
    del_ok = client_with_db.delete(
        f"/api/v1/deal-rooms/{room_id}/documents/{doc_id}",
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert del_ok.status_code == 204

    # Documents list is now empty
    list_docs = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/documents",
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert len(list_docs.json()) == 0


def test_deal_room_ai_copilot_provenance(
    client_with_db: TestClient, test_db_session: Session
):
    """AI Copilot generates deterministic or live analysis with 6-class provenance breakdown."""
    ctx = setup_accepted_proposal(client_with_db, test_db_session)
    room_id = client_with_db.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": ctx["proposal_id"]},
        headers=AUTH_HEADER(ctx["sender_token"]),
    ).json()["id"]

    # Call AI analyze
    resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/ai/analyze",
        json={"analysis_type": "SUMMARY"},
        headers=AUTH_HEADER(ctx["sender_token"]),
    )
    assert resp.status_code == 200, resp.text
    ai_data = resp.json()

    assert "summary" in ai_data and len(ai_data["summary"]) > 0
    assert len(ai_data["key_findings"]) > 0
    assert "provenance_breakdown" in ai_data
    provenance = ai_data["provenance_breakdown"]

    # Verify all 6 provenance keys exist
    expected_keys = {
        "AGREED_TERM",
        "USER_RECORDED_FACT",
        "VERIFIED_RECORD",
        "AI_SUGGESTION",
        "AI_HYPOTHESIS",
        "UNKNOWN_OR_MISSING",
    }
    assert expected_keys.issubset(set(provenance.keys()))

    # Verify agreed terms were grounded from proposal
    assert len(provenance["AGREED_TERM"]) > 0
    assert any(
        "12,500.50" in term or "12500.50" in term for term in provenance["AGREED_TERM"]
    )


def test_deal_room_resolution_by_proposal_id(test_db_session: Session):
    """DealRoomService resolves rooms both by DealRoom id and by proposal_id fallback."""
    from app.models.proposal import Proposal, ProposalStatus
    from app.schemas.deal_room import DealRoomCreatePayload
    from app.services.deal_room_service import DealRoomService

    sender, _ = make_user(test_db_session, "u-s-prop-lookup", "s-prop-lookup@test.com")
    recip, _ = make_user(test_db_session, "u-r-prop-lookup", "r-prop-lookup@test.com")
    conn = make_accepted_connection(
        test_db_session, sender.id, recip.id, conn_id="conn-lookup-test"
    )
    opp = create_test_opportunity(test_db_session, "opp-lookup-test", sender.id)

    prop = Proposal(
        id="prop_test_lookup_fallback",
        connection_id=conn.id,
        opportunity_id=opp.id,
        proposer_id=sender.id,
        recipient_id=recip.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Lookup Fallback Agreement",
        description="A test proposal description for fallback resolution testing.",
        budget_amount=Decimal("1000.00"),
        currency="USD",
        scope_of_work="Testing proposal ID fallback resolution",
        deliverables=["D1"],
        milestones=[{"title": "M1", "amount": 1000.00}],
        responsibilities={"payer": sender.id, "payee": recip.id},
    )
    test_db_session.add(prop)
    test_db_session.commit()

    service = DealRoomService()
    created = service.create_deal_room(
        db=test_db_session,
        user_id=sender.id,
        payload=DealRoomCreatePayload(proposal_id=prop.id),
    )
    assert created.id.startswith("room_")

    # 1. Fetch by canonical room.id
    by_room = service.get_deal_room(test_db_session, sender.id, created.id)
    assert by_room.id == created.id

    # 2. Fetch by proposal_id ('prop_...')
    by_proposal = service.get_deal_room(test_db_session, sender.id, prop.id)
    assert by_proposal.id == created.id
    assert by_proposal.title == "Lookup Fallback Agreement"

    # 3. Fetch overview by proposal_id ('prop_...')
    overview = service.get_deal_room_overview(test_db_session, sender.id, prop.id)
    assert overview.id == created.id
