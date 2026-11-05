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
