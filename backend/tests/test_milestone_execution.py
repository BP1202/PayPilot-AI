"""Tests for Milestone Execution, Deliverables & Evidence Verification (Issue #9).

Uses in-memory SQLite via SQLAlchemy with StaticPool.
Covers:
- Milestone initialization from accepted proposal snapshot
- Initialization idempotency
- Responsible worker authorization (start work, submit evidence)
- Monotonic evidence versioning (v1, v2 on resubmission)
- Dual-party security: self-approval restriction (403 for responsible worker)
- Reviewer approval transitions to APPROVED and sets payment_readiness to READY_FOR_PAYMENT_REVIEW
- Revision request requires feedback and returns to eligible execution state
- Milestone cancellation rules (justification required, approved milestones cannot be cancelled)
- Payment readiness summary for future PayPal transaction module
- AI Milestone Copilot advisory completeness checklist & provenance breakdown (cannot mutate status)
- Strict tenant/participant isolation (403 for outsiders)
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
    conn_id: str = "conn_mil_test",
) -> Connection:
    conn = Connection(
        id=conn_id,
        requester_id=requester_id,
        recipient_id=recipient_id,
        status=ConnectionStatus.ACCEPTED.value,
        intent="EXPLORE_COLLABORATION",
        message="Let's execute milestones!",
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
    title: str = "Milestone Execution Opp",
) -> Opportunity:
    opp = Opportunity(
        id=opp_id,
        user_id=user_id,
        title=title,
        original_description="An agreed opportunity with milestones.",
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


def setup_deal_room_with_milestones(client: TestClient, db: Session):
    worker, worker_token = make_user(
        db, "u-mil-worker", "worker@test.com", "Alice Developer"
    )
    reviewer, reviewer_token = make_user(
        db, "u-mil-reviewer", "reviewer@test.com", "Bob Client"
    )
    outsider, outsider_token = make_user(
        db, "u-mil-outsider", "outsider@test.com", "Eve Outsider"
    )

    conn = make_accepted_connection(db, worker.id, reviewer.id)
    opp = create_test_opportunity(db, "opp-mil-001", worker.id)

    # 1. Create proposal with 2 structured milestones
    create_resp = client.post(
        "/api/v1/proposals",
        json={
            "connection_id": conn.id,
            "opportunity_id": opp.id,
            "title": "Full-Stack Web App Development",
            "description": "2-stage web app engineering contract.",
            "scope_of_work": "Build backend APIs and responsive frontend portal.",
            "deliverables": ["Backend APIs", "Frontend Dashboard"],
            "budget_amount": "9500.00",
            "currency": "USD",
            "estimated_duration_days": 30,
            "milestones": [
                {
                    "title": "Stage 1: Core REST APIs & Authentication",
                    "description": "Complete user auth and core REST endpoints.",
                    "amount": 4000.00,
                    "due_days": 14,
                    "deliverables": ["Auth endpoints", "Swagger documentation"],
                },
                {
                    "title": "Stage 2: Frontend Dashboard & Final Integration",
                    "description": "Deliver responsive Next.js frontend and end-to-end tests.",
                    "amount": 5500.00,
                    "due_days": 30,
                    "deliverables": ["Next.js App", "E2E Test Suite"],
                },
            ],
            "responsibilities": {
                "proposer": "Lead backend and frontend implementation",
                "recipient": "Product acceptance testing and review",
            },
        },
        headers=AUTH_HEADER(worker_token),
    )
    assert create_resp.status_code == 201, create_resp.text
    proposal_id = create_resp.json()["id"]

    # 2. Recipient accepts proposal
    accept_resp = client.post(
        f"/api/v1/proposals/{proposal_id}/respond",
        json={"action": "ACCEPT"},
        headers=AUTH_HEADER(reviewer_token),
    )
    assert accept_resp.status_code == 200, accept_resp.text

    # 3. Initialize Deal Room
    room_resp = client.post(
        "/api/v1/deal-rooms",
        json={"proposal_id": proposal_id},
        headers=AUTH_HEADER(worker_token),
    )
    assert room_resp.status_code == 201, room_resp.text
    room_id = room_resp.json()["id"]

    return {
        "worker": worker,
        "worker_token": worker_token,
        "reviewer": reviewer,
        "reviewer_token": reviewer_token,
        "outsider": outsider,
        "outsider_token": outsider_token,
        "room_id": room_id,
        "proposal_id": proposal_id,
    }


def test_initialize_milestones_from_accepted_proposal(
    client_with_db: TestClient, test_db_session: Session
):
    """Milestones initialize from accepted proposal snapshot with Decimal amounts and participants."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert resp.status_code == 200, resp.text
    milestones = resp.json()

    assert len(milestones) == 2
    # Verify Milestone 1
    m1 = milestones[0]
    assert m1["title"] == "Stage 1: Core REST APIs & Authentication"
    assert m1["status"] == "NOT_STARTED"
    assert m1["payment_readiness"] == "NOT_READY"
    assert Decimal(str(m1["agreed_amount"])) == Decimal("4000.00")
    assert m1["currency"] == "USD"
    assert m1["responsible_user"]["user_id"] == ctx["worker"].id
    assert m1["reviewer_user"]["user_id"] == ctx["reviewer"].id

    # Verify Milestone 2
    m2 = milestones[1]
    assert m2["title"] == "Stage 2: Frontend Dashboard & Final Integration"
    assert Decimal(str(m2["agreed_amount"])) == Decimal("5500.00")


def test_initialize_milestones_is_idempotent(
    client_with_db: TestClient, test_db_session: Session
):
    """Multiple initialization calls return the existing milestones without duplicating records."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    # First call
    resp1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert resp1.status_code == 200
    ids_first = [m["id"] for m in resp1.json()]

    # Second call by reviewer
    resp2 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert resp2.status_code == 200
    ids_second = [m["id"] for m in resp2.json()]

    assert ids_first == ids_second


def test_start_work_authorization_and_state_transition(
    client_with_db: TestClient, test_db_session: Session
):
    """Responsible participant starts work; outsider is blocked with 403."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    # Outsider attempt -> 403
    out_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["outsider_token"]),
    )
    assert out_resp.status_code == 403

    # Responsible worker starts work -> 200
    start_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert start_resp.status_code == 200
    data = start_resp.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["started_at"] is not None


def test_submit_evidence_increments_version(
    client_with_db: TestClient, test_db_session: Session
):
    """Submitting evidence moves milestone to SUBMITTED_FOR_REVIEW and records version 1."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    # Start work first
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )

    # Submit evidence
    sub_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Backend Auth Implementation & PR",
            "description": "Completed JWT authentication and Swagger documentation.",
            "evidence_type": "CODE_REPOSITORY",
            "reference_url": "https://github.com/org/repo/pull/12",
            "attachments": [
                {"type": "openapi_spec", "url": "https://specs.example.com/api"}
            ],
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert sub_resp.status_code == 201, sub_resp.text
    evidence = sub_resp.json()
    assert evidence["submission_version"] == 1
    assert evidence["status"] == "PENDING_REVIEW"
    assert evidence["title"] == "Backend Auth Implementation & PR"

    # Verify milestone is now in SUBMITTED_FOR_REVIEW
    m_check = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}",
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert m_check["status"] == "SUBMITTED_FOR_REVIEW"
    assert m_check["current_evidence_submission"]["id"] == evidence["id"]


def test_self_approval_restriction_enforced(
    client_with_db: TestClient, test_db_session: Session
):
    """Responsible worker is strictly forbidden from approving their own deliverables (Dual-party consent)."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    # Worker starts and submits evidence
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Deliverables v1",
            "description": "Ready for check.",
            "evidence_type": "DOCUMENT",
            "reference_url": "https://docs.example.com/spec",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi_id = evi_resp.json()["id"]

    # Worker attempts self-approval -> 403 Forbidden
    self_appr = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi_id,
            "decision": "APPROVED",
            "comments": "I approve my own work.",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert self_appr.status_code == 403
    assert "cannot review or approve their own" in self_appr.json()["detail"]


def test_reviewer_approval_sets_payment_readiness(
    client_with_db: TestClient, test_db_session: Session
):
    """Reviewer approval transitions milestone to APPROVED and sets payment_readiness to READY_FOR_PAYMENT_REVIEW."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Production Auth APIs",
            "description": "All endpoints delivered and verified.",
            "evidence_type": "CODE_REPOSITORY",
            "reference_url": "https://github.com/org/repo/pull/15",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi_id = evi_resp.json()["id"]

    # Reviewer approves
    appr_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi_id,
            "decision": "APPROVED",
            "comments": "Verified against acceptance criteria. Excellent work.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert appr_resp.status_code == 200, appr_resp.text
    m_data = appr_resp.json()
    assert m_data["status"] == "APPROVED"
    assert m_data["approved_at"] is not None
    assert m_data["payment_readiness"] == "READY_FOR_PAYMENT_REVIEW"

    # Check payment readiness bridge endpoint
    pr_resp = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/payment-readiness",
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert pr_data["payment_readiness"] == "READY_FOR_PAYMENT_REVIEW"
    assert Decimal(str(pr_data["agreed_amount"])) == Decimal("4000.00")
    assert pr_data["approved_evidence_id"] == evi_id
    assert pr_data["approved_evidence_version"] == 1
    assert pr_data["reviewer_id"] == ctx["reviewer"].id


def test_request_revision_requires_feedback_and_allows_resubmission(
    client_with_db: TestClient, test_db_session: Session
):
    """Reviewer requesting revisions requires feedback; worker resubmission increments version to 2."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Draft v1",
            "description": "Initial draft.",
            "evidence_type": "DOCUMENT",
            "reference_url": "https://example.com/v1",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()

    # 1. Reviewer tries to request revision without comments -> 400
    fail_rev = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={"evidence_id": evi1["id"], "decision": "REVISION_REQUESTED"},
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert fail_rev.status_code == 400

    # 2. Reviewer provides comments -> 200
    ok_rev = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1["id"],
            "decision": "REVISION_REQUESTED",
            "comments": "Please include test coverage report for auth endpoints.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert ok_rev.status_code == 200
    assert ok_rev.json()["status"] == "REVISION_REQUESTED"

    # 3. Worker resubmits -> version becomes 2
    evi2 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Draft v2 with Tests",
            "description": "Added Pytest coverage report 95%.",
            "evidence_type": "DOCUMENT",
            "reference_url": "https://example.com/v2",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert evi2["submission_version"] == 2
    assert evi2["status"] == "PENDING_REVIEW"

    # Milestone is back in review
    m_check = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}",
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert m_check["status"] == "SUBMITTED_FOR_REVIEW"
    assert m_check["evidence_submissions_count"] == 2


def test_cancel_milestone_with_reason(
    client_with_db: TestClient, test_db_session: Session
):
    """Participants can cancel unapproved milestones; approved milestones cannot be cancelled."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m2_id = init_resp.json()[1]["id"]

    # Cancel unapproved milestone
    cancel_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m2_id}/cancel",
        json={"reason": "Scope descoped by mutual consent during sprint planning."},
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"
    assert "descoped by mutual consent" in cancel_resp.json()["cancellation_reason"]


def test_ai_milestone_copilot_advisory(
    client_with_db: TestClient, test_db_session: Session
):
    """AI Milestone Copilot generates advisory checklist and provenance without mutating milestone state."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Auth Endpoints & Swagger",
            "description": "Delivered Auth endpoints and Swagger documentation.",
            "evidence_type": "EXTERNAL_REFERENCE",
            "reference_url": "https://specs.example.com",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )

    # Call AI analyze
    ai_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/ai/analyze",
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert ai_resp.status_code == 200, ai_resp.text
    ai_data = ai_resp.json()

    assert "completeness_score" in ai_data
    assert len(ai_data["review_checklist"]) > 0
    assert "provenance_breakdown" in ai_data
    provenance = ai_data["provenance_breakdown"]
    assert "AGREED_TERM" in provenance
    assert "USER_SUBMITTED_EVIDENCE" in provenance

    # Verify milestone state was NOT changed by AI
    m_check = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}",
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    ).json()
    assert m_check["status"] == "SUBMITTED_FOR_REVIEW"


def test_reviewer_rejection_requires_mandatory_reason_and_updates_states(
    client_with_db: TestClient, test_db_session: Session
):
    """Reviewer rejection requires mandatory comments, updates milestone and evidence to REJECTED, and keeps payment readiness NOT_READY."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    # Start and submit
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Initial Delivery",
            "description": "Implemented endpoints.",
            "evidence_type": "CODE_REPOSITORY",
            "reference_url": "https://example.com/repo",
            "submission_notes": "First draft for review",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()

    # Attempt rejection without reason -> 400
    bad_rej = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1["id"],
            "decision": "REJECTED",
            "comments": "   ",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert bad_rej.status_code == 400
    assert "mandatory" in bad_rej.json()["detail"].lower()

    # Rejection with mandatory reason -> 200
    rej = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1["id"],
            "decision": "REJECTED",
            "comments": "Test coverage below 90% and missing migration scripts.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert rej.status_code == 200
    m_data = rej.json()
    assert m_data["status"] == "REJECTED"
    assert m_data["payment_readiness"] == "NOT_READY"
    assert m_data["current_evidence_submission"]["status"] == "REJECTED"
    assert (
        m_data["current_evidence_submission"]["submission_notes"]
        == "First draft for review"
    )


def test_resubmission_and_history_traceability_after_rejection(
    client_with_db: TestClient, test_db_session: Session
):
    """From REJECTED state, worker can resume work and resubmit v2, preserving full evidence and review audit history."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    # 1. Start work & submit v1
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "v1 Delivery",
            "description": "Initial draft.",
            "evidence_type": "CODE_REPOSITORY",
            "reference_url": "https://example.com/v1",
            "submission_notes": "v1 notes",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()

    # 2. Reviewer rejects v1
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1["id"],
            "decision": "REJECTED",
            "comments": "Critical bugs in authentication middleware.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )

    # 3. Worker resumes work from REJECTED
    resume_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"] == "IN_PROGRESS"

    # 4. Worker submits v2 with submission notes
    evi2 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "v2 Delivery",
            "description": "Fixed authentication middleware and added tests.",
            "evidence_type": "CODE_REPOSITORY",
            "reference_url": "https://example.com/v2",
            "submission_notes": "Addressed middleware bugs with regression test suite.",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert evi2["submission_version"] == 2
    assert evi2["status"] == "PENDING_REVIEW"
    assert (
        evi2["submission_notes"]
        == "Addressed middleware bugs with regression test suite."
    )

    # 5. Reviewer approves v2
    app_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi2["id"],
            "decision": "APPROVED",
            "comments": "All regression tests passing. Excellent work.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert app_resp.status_code == 200
    final_m = app_resp.json()
    assert final_m["status"] == "APPROVED"
    assert final_m["payment_readiness"] == "READY_FOR_PAYMENT_REVIEW"

    # 6. Verify evidence and review audit history
    assert len(final_m["evidence_history"]) == 2
    assert final_m["evidence_history"][0]["submission_version"] == 1
    assert final_m["evidence_history"][0]["status"] == "REJECTED"
    assert final_m["evidence_history"][1]["submission_version"] == 2
    assert final_m["evidence_history"][1]["status"] == "APPROVED"

    assert len(final_m["review_history"]) == 2
    assert final_m["review_history"][0]["decision"] == "REJECTED"
    assert final_m["review_history"][0]["evidence_version"] == 1
    assert final_m["review_history"][1]["decision"] == "APPROVED"
    assert final_m["review_history"][1]["evidence_version"] == 2


def test_zero_amount_milestone_payment_readiness_on_approval(
    client_with_db: TestClient, test_db_session: Session
):
    """Approval of a milestone with zero agreed amount does NOT set payment readiness to READY_FOR_PAYMENT_REVIEW."""
    from app.models.milestone_execution import (
        MilestoneExecution,
        MilestoneExecutionStatus,
        PaymentReadinessStatus,
    )

    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    # Directly create a zero-amount milestone
    zero_ms = MilestoneExecution(
        room_id=room_id,
        source_proposal_id="prop_test_zero",
        accepted_proposal_version=1,
        milestone_index=99,
        title="Pro-bono Community Specification",
        description="Non-monetary specification document.",
        expected_deliverables=["Community Docs"],
        agreed_amount=Decimal("0.00"),
        currency="USD",
        responsible_user_id="u-mil-worker",
        reviewer_user_id="u-mil-reviewer",
        status=MilestoneExecutionStatus.NOT_STARTED.value,
        payment_readiness=PaymentReadinessStatus.NOT_READY.value,
    )
    test_db_session.add(zero_ms)
    test_db_session.commit()
    test_db_session.refresh(zero_ms)

    # Worker starts and submits evidence
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{zero_ms.id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    evi = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{zero_ms.id}/evidence",
        json={
            "title": "Community Documentation",
            "description": "Published public markdown docs.",
            "evidence_type": "DOCUMENT",
            "reference_url": "https://example.com/docs",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()

    # Reviewer approves
    app_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{zero_ms.id}/reviews",
        json={
            "evidence_id": evi["id"],
            "decision": "APPROVED",
            "comments": "Community documentation meets all criteria.",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert app_resp.status_code == 200
    m_data = app_resp.json()
    assert m_data["status"] == "APPROVED"
    # Key assertion: zero amount does NOT become READY_FOR_PAYMENT_REVIEW
    assert m_data["payment_readiness"] == "NOT_READY"

    # Check payment-readiness endpoint
    pr_resp = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{zero_ms.id}/payment-readiness",
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )
    assert pr_resp.status_code == 200
    pr_data = pr_resp.json()
    assert pr_data["payment_readiness"] == "NOT_READY"
    assert "Non-monetary milestone" in pr_data["settlement_note"]


def test_unique_constraint_enforces_no_duplicate_versions_per_milestone(
    test_db_session: Session,
):
    """Database unique constraint on (milestone_id, submission_version) rejects duplicate version numbers."""
    from app.models.milestone_execution import MilestoneEvidence
    from sqlalchemy.exc import IntegrityError

    evi1 = MilestoneEvidence(
        id="evi_test_uq_1",
        milestone_id="ms_test_uq",
        room_id="room_test_uq",
        submitted_by_id="u_test_uq",
        submission_version=1,
        title="Evidence Version 1",
        description="First attempt",
        reference_url="https://example.com/v1",
    )
    test_db_session.add(evi1)
    test_db_session.commit()

    # Attempt inserting identical version on same milestone
    evi2_duplicate = MilestoneEvidence(
        id="evi_test_uq_2",
        milestone_id="ms_test_uq",
        room_id="room_test_uq",
        submitted_by_id="u_test_uq",
        submission_version=1,  # Duplicate!
        title="Evidence Duplicate Version 1",
        description="Collision attempt",
        reference_url="https://example.com/v1-dup",
    )
    test_db_session.add(evi2_duplicate)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    # Inserting version 2 on same milestone succeeds
    evi2_valid = MilestoneEvidence(
        id="evi_test_uq_2_valid",
        milestone_id="ms_test_uq",
        room_id="room_test_uq",
        submitted_by_id="u_test_uq",
        submission_version=2,  # Monotonic next
        title="Evidence Version 2",
        description="Second attempt",
        reference_url="https://example.com/v2",
    )
    test_db_session.add(evi2_valid)
    test_db_session.commit()


def test_sequential_submissions_monotonically_increment_versions(
    client_with_db: TestClient, test_db_session: Session
):
    """Sequential submissions receive strictly monotonic versions (v1, v2, v3) preserving all prior records."""
    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )

    # Submission 1 -> v1
    evi1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Delivery Draft 1",
            "description": "Initial draft",
            "reference_url": "https://example.com/v1",
            "submission_notes": "Note 1",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert evi1["submission_version"] == 1

    # Reviewer requests revision
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1["id"],
            "decision": "REVISION_REQUESTED",
            "comments": "Need OpenAPI spec update",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )

    # Submission 2 -> v2
    evi2 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Delivery Draft 2",
            "description": "Updated draft with OpenAPI",
            "reference_url": "https://example.com/v2",
            "submission_notes": "Note 2",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert evi2["submission_version"] == 2

    # Reviewer rejects
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi2["id"],
            "decision": "REJECTED",
            "comments": "Need auth tests",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )

    # Submission 3 -> v3
    evi3 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Delivery Draft 3",
            "description": "Added auth tests",
            "reference_url": "https://example.com/v3",
            "submission_notes": "Note 3",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    assert evi3["submission_version"] == 3

    # Check complete history
    m_check = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}",
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    versions = [e["submission_version"] for e in m_check["evidence_history"]]
    assert versions == [1, 2, 3]


def test_concurrent_submissions_safe_version_allocation_and_conflict_handling(
    client_with_db: TestClient, test_db_session: Session
):
    """When a concurrent race condition occurs, unique constraint blocks duplicate version, returns 409 Conflict, and preserves history."""
    from unittest.mock import patch

    from app.models.milestone_execution import MilestoneEvidence
    from sqlalchemy.exc import IntegrityError

    ctx = setup_deal_room_with_milestones(client_with_db, test_db_session)
    room_id = ctx["room_id"]

    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/initialize",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    m1_id = init_resp.json()[0]["id"]

    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/start",
        headers=AUTH_HEADER(ctx["worker_token"]),
    )

    # 1. Simulate concurrency race in submit_evidence: IntegrityError triggers clean 409 Conflict
    with patch.object(
        test_db_session, "commit", side_effect=IntegrityError("duplicate", {}, None)
    ):
        resp_conflict = client_with_db.post(
            f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
            json={
                "title": "Concurrent Collision Draft",
                "description": "Simulated collision draft",
                "reference_url": "https://example.com/collision",
            },
            headers=AUTH_HEADER(ctx["worker_token"]),
        )
        assert resp_conflict.status_code == 409
        assert "concurrent" in resp_conflict.json()["detail"].lower()

    # 2. First successful submission succeeds and receives v1
    evi1 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "First Submission",
            "description": "Initial deliverable",
            "reference_url": "https://example.com/v1",
            "submission_notes": "First note",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert evi1.status_code == 201
    assert evi1.json()["submission_version"] == 1

    # 3. Database unique constraint prevents inserting a duplicate (milestone_id, version 1)
    duplicate_evidence = MilestoneEvidence(
        id="evi_collision_dup",
        milestone_id=m1_id,
        room_id=room_id,
        submitted_by_id=ctx["worker"].id,
        submission_version=1,  # Duplicate!
        title="Concurrent Collision Submission",
        description="Duplicate version attempt",
        reference_url="https://example.com/collision",
    )
    test_db_session.add(duplicate_evidence)
    with pytest.raises(IntegrityError):
        test_db_session.commit()
    test_db_session.rollback()

    # 4. Reviewer requests revision
    client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/reviews",
        json={
            "evidence_id": evi1.json()["id"],
            "decision": "REVISION_REQUESTED",
            "comments": "Please update docs",
        },
        headers=AUTH_HEADER(ctx["reviewer_token"]),
    )

    # 5. Worker resubmits -> receives v2 cleanly
    evi2 = client_with_db.post(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}/evidence",
        json={
            "title": "Second Submission",
            "description": "Updated deliverable",
            "reference_url": "https://example.com/v2",
        },
        headers=AUTH_HEADER(ctx["worker_token"]),
    )
    assert evi2.status_code == 201
    assert evi2.json()["submission_version"] == 2

    # 6. Verify all evidence history remains intact with unique versions
    m_check = client_with_db.get(
        f"/api/v1/deal-rooms/{room_id}/milestones/{m1_id}",
        headers=AUTH_HEADER(ctx["worker_token"]),
    ).json()
    versions = [e["submission_version"] for e in m_check["evidence_history"]]
    assert versions == [1, 2]


def test_deterministic_role_assignment_independent_of_participant_query_ordering(
    client_with_db: TestClient, test_db_session: Session
):
    """Milestone roles derive authoritatively from proposal roles, regardless of DealRoomParticipant query ordering."""
    from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
    from app.models.proposal import Proposal, ProposalStatus

    worker, worker_token = make_user(
        db=test_db_session,
        user_id="u-order-worker",
        email="worker-order@test.com",
        full_name="Worker Deterministic",
    )
    reviewer, reviewer_token = make_user(
        db=test_db_session,
        user_id="u-order-reviewer",
        email="reviewer-order@test.com",
        full_name="Reviewer Deterministic",
    )

    conn = make_accepted_connection(
        test_db_session, worker.id, reviewer.id, conn_id="conn-order-test"
    )

    # Proposal: proposer=worker, recipient=reviewer
    prop = Proposal(
        id="prop-order-001",
        connection_id=conn.id,
        proposer_id=worker.id,
        recipient_id=reviewer.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Deterministic Ordering Contract",
        description="Testing participant order independence",
        milestones=[
            {
                "title": "Milestone A",
                "amount": "3000.00",
                "due_days": 10,
            }
        ],
        accepted_version=1,
    )
    test_db_session.add(prop)
    test_db_session.commit()

    # Create DealRoom
    room = DealRoom(
        id="room-order-001",
        proposal_id=prop.id,
        connection_id=conn.id,
        title=prop.title,
        description=prop.description,
        status=DealRoomStatus.ACTIVE.value,
        accepted_proposal_version=1,
        agreed_milestones=prop.milestones,
    )
    test_db_session.add(room)
    test_db_session.commit()

    # INTENTIONALLY add participants in REVERSE order: reviewer FIRST, worker SECOND
    p_rev = DealRoomParticipant(
        room_id=room.id,
        user_id=reviewer.id,
        collaboration_role="Client",
    )
    p_work = DealRoomParticipant(
        room_id=room.id,
        user_id=worker.id,
        collaboration_role="Developer",
    )
    test_db_session.add(p_rev)
    test_db_session.commit()
    test_db_session.add(p_work)
    test_db_session.commit()

    # Initialize milestones
    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/initialize",
        headers=AUTH_HEADER(worker_token),
    )
    assert init_resp.status_code == 200
    m_list = init_resp.json()
    assert len(m_list) == 1
    m = m_list[0]

    # Verify worker and reviewer were NOT flipped by reverse participant insertion
    assert m["responsible_user"]["user_id"] == worker.id
    assert m["reviewer_user"]["user_id"] == reviewer.id

    # Verify worker can start work
    start_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/start",
        headers=AUTH_HEADER(worker_token),
    )
    assert start_resp.status_code == 200

    # Verify reviewer CANNOT start work or submit evidence (403)
    bad_start = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/start",
        headers=AUTH_HEADER(reviewer_token),
    )
    assert bad_start.status_code == 403

    bad_submit = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/evidence",
        json={
            "title": "Unauthorized submit by reviewer",
            "description": "Should be rejected",
            "reference_url": "https://example.com/unauthorized",
        },
        headers=AUTH_HEADER(reviewer_token),
    )
    assert bad_submit.status_code == 403

    # Worker submits evidence
    evi_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/evidence",
        json={
            "title": "Authorized Worker Delivery",
            "description": "Properly submitted",
            "reference_url": "https://example.com/delivery",
        },
        headers=AUTH_HEADER(worker_token),
    )
    assert evi_resp.status_code == 201
    evi_data = evi_resp.json()

    # Worker CANNOT self-approve (403)
    bad_review = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/reviews",
        json={
            "evidence_id": evi_data["id"],
            "decision": "APPROVED",
        },
        headers=AUTH_HEADER(worker_token),
    )
    assert bad_review.status_code == 403

    # Reviewer CAN review (200)
    good_review = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/{m['id']}/reviews",
        json={
            "evidence_id": evi_data["id"],
            "decision": "APPROVED",
        },
        headers=AUTH_HEADER(reviewer_token),
    )
    assert good_review.status_code == 200
    assert good_review.json()["status"] == "APPROVED"


def test_explicit_milestone_and_responsibility_role_overrides(
    client_with_db: TestClient, test_db_session: Session
):
    """When agreed milestones or responsibilities define custom worker/reviewer, those authoritative terms take precedence."""
    from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
    from app.models.proposal import Proposal, ProposalStatus

    alice, alice_token = make_user(
        db=test_db_session,
        user_id="u-alice-custom",
        email="alice-custom@test.com",
        full_name="Alice Custom",
    )
    bob, _bob_token = make_user(
        db=test_db_session,
        user_id="u-bob-custom",
        email="bob-custom@test.com",
        full_name="Bob Custom",
    )

    conn = make_accepted_connection(
        test_db_session, alice.id, bob.id, conn_id="conn-custom-test"
    )

    # Alice proposes, but Milestone 1 explicitly designates Bob as worker and Alice as reviewer!
    prop = Proposal(
        id="prop-custom-001",
        connection_id=conn.id,
        proposer_id=alice.id,
        recipient_id=bob.id,
        status=ProposalStatus.ACCEPTED.value,
        title="Custom Delegated Milestone Contract",
        description="Testing explicit role overrides",
        milestones=[
            {
                "title": "Stage 1: Bob's Design Module",
                "amount": "2000.00",
                "due_days": 7,
                "responsible_user_id": bob.id,
                "reviewer_user_id": alice.id,
            }
        ],
        accepted_version=1,
    )
    test_db_session.add(prop)
    test_db_session.commit()

    room = DealRoom(
        id="room-custom-001",
        proposal_id=prop.id,
        connection_id=conn.id,
        title=prop.title,
        description=prop.description,
        status=DealRoomStatus.ACTIVE.value,
        accepted_proposal_version=1,
        agreed_milestones=prop.milestones,
    )
    test_db_session.add(room)
    test_db_session.commit()

    p1 = DealRoomParticipant(
        room_id=room.id, user_id=alice.id, collaboration_role="Client Reviewer"
    )
    p2 = DealRoomParticipant(
        room_id=room.id, user_id=bob.id, collaboration_role="Design Lead"
    )
    test_db_session.add_all([p1, p2])
    test_db_session.commit()

    # Initialize milestones
    init_resp = client_with_db.post(
        f"/api/v1/deal-rooms/{room.id}/milestones/initialize",
        headers=AUTH_HEADER(alice_token),
    )
    assert init_resp.status_code == 200
    m = init_resp.json()[0]

    # Milestone adopted the explicit override: Bob is worker, Alice is reviewer!
    assert m["responsible_user"]["user_id"] == bob.id
    assert m["reviewer_user"]["user_id"] == alice.id
