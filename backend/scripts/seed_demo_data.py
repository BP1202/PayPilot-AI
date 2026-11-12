"""Create a fictional, local-only Opnly workflow for manual testing.

The CLI is opt-in, development-only, and never deletes or resets existing data.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.business import Business
from app.models.connection import Connection, ConnectionIntent, ConnectionStatus
from app.models.deal_room import DealRoom, DealRoomParticipant, DealRoomStatus
from app.models.milestone_execution import (
    EvidenceReviewStatus,
    MilestoneEvidence,
    MilestoneEvidenceType,
    MilestoneExecution,
    MilestoneExecutionStatus,
    MilestoneReview,
    MilestoneReviewDecision,
    PaymentReadinessStatus,
)
from app.models.opportunity import (
    Opportunity,
    OpportunityCategory,
    OpportunityIntent,
    OpportunityStatus,
    OpportunityType,
    OpportunityVisibility,
    ProvenanceCategory,
)
from app.models.profile import IndividualProfile, ProfileVisibility
from app.models.proposal import Proposal, ProposalStatus
from app.models.proposal_revision import ProposalRevision
from app.models.user import User
from app.services.payment_service import PaymentService

DEMO_ACCOUNTS = (
    {
        "id": "demo_org_northstar",
        "email": "northstar.owner@opnly-demo.test",
        "name": "Jordan Lee",
        "headline": "Retail technology operator",
        "bio": "Fictional demo account representing a business seeking a retail inventory integration.",
        "location": "Demo City",
        "industry": "Retail Technology",
        "skills": ["Retail operations", "Inventory planning"],
        "experience": ["Demo profile for local workflow testing"],
        "services": [],
        "resources": ["Sample retail workflow"],
        "interests": ["Inventory integration"],
        "business": {
            "name": "Northstar Retail Systems (Demo)",
            "industry": "Retail Technology",
            "business_type": "Technology company",
            "description": "Fictional local demo company seeking help connecting inventory systems.",
            "category": OpportunityCategory.TECH.value,
            "opportunity_title": "Connect store inventory with online orders",
            "opportunity_description": "Demo need: reduce manual inventory updates between physical stores and online orders.",
            "required": ["API integration", "Inventory systems", "Web development"],
        },
    },
    {
        "id": "demo_org_cedar_grove",
        "email": "cedar.owner@opnly-demo.test",
        "name": "Morgan Patel",
        "headline": "Food business owner",
        "bio": "Fictional demo account representing a growing food business with an operations challenge.",
        "location": "Demo City",
        "industry": "Food and Beverage",
        "skills": ["Food operations", "Supplier coordination"],
        "experience": ["Demo profile for local workflow testing"],
        "services": [],
        "resources": ["Sample wholesale workflow"],
        "interests": ["Order management", "Operations"],
        "business": {
            "name": "Cedar Grove Foods (Demo)",
            "industry": "Food and Beverage",
            "business_type": "Food business",
            "description": "Fictional local demo company seeking help organizing wholesale orders.",
            "category": OpportunityCategory.BUSINESS.value,
            "opportunity_title": "Simplify wholesale order coordination",
            "opportunity_description": "Demo need: coordinate wholesale orders and delivery updates across a small supplier network.",
            "required": ["Operations design", "Order management", "Data workflows"],
        },
    },
    {
        "id": "demo_org_solaris",
        "email": "solaris.owner@opnly-demo.test",
        "name": "Riley Chen",
        "headline": "Clean mobility business operator",
        "bio": "Fictional demo account representing a clean mobility business exploring a charging operations solution.",
        "location": "Demo City",
        "industry": "Clean Mobility",
        "skills": ["Fleet operations", "Partnership development"],
        "experience": ["Demo profile for local workflow testing"],
        "services": [],
        "resources": ["Sample charging-site workflow"],
        "interests": ["Energy monitoring", "Fleet charging"],
        "business": {
            "name": "Solaris Mobility (Demo)",
            "industry": "Clean Mobility",
            "business_type": "Mobility company",
            "description": "Fictional local demo company seeking help monitoring fleet charging.",
            "category": OpportunityCategory.LOCAL.value,
            "opportunity_title": "Monitor charging at shared fleet depots",
            "opportunity_description": "Demo need: understand charger availability and energy usage across shared fleet depots.",
            "required": ["IoT monitoring", "Energy systems", "Data visualization"],
        },
    },
    {
        "id": "demo_solver_priya",
        "email": "priya.solver@opnly-demo.test",
        "name": "Priya Nair",
        "headline": "Full-stack software developer",
        "bio": "Fictional demo solver profile focused on web applications and system integrations.",
        "location": "Demo City",
        "industry": "Software",
        "skills": ["TypeScript", "React", "Python", "REST APIs"],
        "experience": ["Demo profile for local workflow testing"],
        "services": ["Web application development", "API integration"],
        "resources": [],
        "interests": ["Retail technology", "Business software"],
        "business": None,
    },
    {
        "id": "demo_solver_omar",
        "email": "omar.solver@opnly-demo.test",
        "name": "Omar Hassan",
        "headline": "Business operations and data specialist",
        "bio": "Fictional demo solver profile focused on process mapping and operational data workflows.",
        "location": "Demo City",
        "industry": "Business Operations",
        "skills": ["Process mapping", "SQL", "Data analysis", "Automation"],
        "experience": ["Demo profile for local workflow testing"],
        "services": ["Operations analysis", "Workflow automation"],
        "resources": [],
        "interests": ["Wholesale", "Supply chain"],
        "business": None,
    },
    {
        "id": "demo_solver_mei",
        "email": "mei.solver@opnly-demo.test",
        "name": "Mei Tan",
        "headline": "IoT and energy systems engineer",
        "bio": "Fictional demo solver profile focused on sensor integration and energy monitoring.",
        "location": "Demo City",
        "industry": "IoT and Energy",
        "skills": ["Embedded systems", "IoT", "Sensor integration", "Data visualization"],
        "experience": ["Demo profile for local workflow testing"],
        "services": ["IoT prototyping", "Energy monitoring"],
        "resources": [],
        "interests": ["Clean mobility", "Fleet operations"],
        "business": None,
    },
)

SOLVER_OPPORTUNITIES = {
    "demo_solver_priya": {
        "title": "Offer: Retail software and API integration",
        "description": "Fictional demo offer: help businesses connect web applications with existing APIs.",
        "category": OpportunityCategory.TECH.value,
        "industry": "Software",
        "capabilities": ["TypeScript", "React", "Python", "REST APIs"],
    },
    "demo_solver_omar": {
        "title": "Offer: Wholesale operations and workflow automation",
        "description": "Fictional demo offer: help map order workflows and improve operational data handling.",
        "category": OpportunityCategory.BUSINESS.value,
        "industry": "Business Operations",
        "capabilities": ["Process mapping", "SQL", "Data analysis", "Automation"],
    },
    "demo_solver_mei": {
        "title": "Offer: IoT monitoring and energy systems",
        "description": "Fictional demo offer: help prototype sensor-based monitoring and energy data views.",
        "category": OpportunityCategory.LOCAL.value,
        "industry": "IoT and Energy",
        "capabilities": ["Embedded systems", "IoT", "Sensor integration", "Data visualization"],
    },
}

DEMO_PASSWORD_ENV = "OPNLY_DEMO_PASSWORD"
DEMO_ROOM_ID = "demo_room_northstar_priya"
DEMO_MILESTONE_ID = "demo_milestone_northstar_priya"
DEMO_OPPORTUNITY_ID = "demo_opportunity_northstar"
DEMO_CONNECTION_ID = "demo_connection_northstar_priya"
DEMO_PROPOSAL_ID = "demo_proposal_northstar_priya"


@dataclass(frozen=True)
class DemoSeedSummary:
    accounts: tuple[str, ...]
    organizations: tuple[str, ...]
    solver_profiles: tuple[str, ...]
    sandbox_room_id: str
    sandbox_milestone_id: str


def seed_demo_data(db: Session, password: str) -> DemoSeedSummary:
    """Create six fictional local test accounts and a ready Sandbox workflow.

    Existing accounts and records are never reset, overwritten, or deleted.
    """
    if len(password) < 12:
        raise ValueError("The demo password must be at least 12 characters.")

    now = datetime.now(UTC)
    password_hash = hash_password(password)
    users: dict[str, User] = {}
    businesses: dict[str, Business] = {}

    for account in DEMO_ACCOUNTS:
        user = _get_or_create_user(db, account, password_hash)
        users[account["id"]] = user
        _get_or_create_profile(db, user, account)

        business_data = account["business"]
        if business_data:
            business = _get_or_create_business(db, user, account, business_data)
            businesses[account["id"]] = business
            _get_or_create_seeking_opportunity(
                db, user, business, account, business_data, now
            )
        else:
            _get_or_create_offering_opportunity(db, user, account, now)

    _create_ready_sandbox_room(
        db,
        payer=users["demo_org_northstar"],
        payee=users["demo_solver_priya"],
        business=businesses["demo_org_northstar"],
        now=now,
    )
    db.flush()

    return DemoSeedSummary(
        accounts=tuple(account["email"] for account in DEMO_ACCOUNTS),
        organizations=tuple(
            account["business"]["name"]
            for account in DEMO_ACCOUNTS
            if account["business"]
        ),
        solver_profiles=tuple(
            account["email"]
            for account in DEMO_ACCOUNTS
            if account["id"].startswith("demo_solver_")
        ),
        sandbox_room_id=DEMO_ROOM_ID,
        sandbox_milestone_id=DEMO_MILESTONE_ID,
    )


def _get_or_create_user(
    db: Session, account: dict[str, object], password_hash: str
) -> User:
    user_id = str(account["id"])
    email = str(account["email"])
    by_id = db.get(User, user_id)
    by_email = db.query(User).filter(User.email == email).first()
    if by_id or by_email:
        if by_id is None or by_email is None or by_id.id != by_email.id:
            raise ValueError(f"Demo account identity conflict for {email}; no changes made.")
        return by_id

    user = User(
        id=user_id,
        email=email,
        full_name=str(account["name"]),
        hashed_password=password_hash,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _get_or_create_profile(
    db: Session, user: User, account: dict[str, object]
) -> IndividualProfile:
    profile = db.get(IndividualProfile, user.id)
    if profile:
        return profile

    profile = IndividualProfile(
        user_id=user.id,
        headline=str(account["headline"]),
        bio=str(account["bio"]),
        location=str(account["location"]),
        industry=str(account["industry"]),
        skills=list(account["skills"]),
        experience=list(account["experience"]),
        services=list(account["services"]),
        resources=list(account["resources"]),
        interests=list(account["interests"]),
        visibility=ProfileVisibility.PUBLIC.value,
    )
    db.add(profile)
    db.flush()
    return profile


def _get_or_create_business(
    db: Session,
    user: User,
    account: dict[str, object],
    business_data: dict[str, object],
) -> Business:
    business_name = str(business_data["name"])
    business = (
        db.query(Business)
        .filter(Business.user_id == user.id, Business.name == business_name)
        .first()
    )
    if business:
        return business

    business = Business(
        name=business_name,
        currency="USD",
        industry=str(business_data["industry"]),
        business_type=str(business_data["business_type"]),
        country="Demo",
        location=str(account["location"]),
        description=str(business_data["description"]),
        user_id=user.id,
        visibility="PUBLIC",
        skills=list(account["skills"]),
        services=list(account["services"]),
        resources=list(account["resources"]),
        interests=list(account["interests"]),
    )
    db.add(business)
    db.flush()
    return business


def _get_or_create_seeking_opportunity(
    db: Session,
    user: User,
    business: Business,
    account: dict[str, object],
    business_data: dict[str, object],
    now: datetime,
) -> Opportunity:
    opportunity_id = f"demo_opportunity_{user.id.removeprefix('demo_org_')}"
    opportunity = db.get(Opportunity, opportunity_id)
    if opportunity:
        if opportunity.user_id != user.id:
            raise ValueError(f"Demo opportunity ID conflict: {opportunity_id}.")
        return opportunity

    opportunity = Opportunity(
        id=opportunity_id,
        user_id=user.id,
        business_id=business.id,
        submission_type=OpportunityType.PROBLEM.value,
        intent=OpportunityIntent.SEEKING_SOLUTION.value,
        category=str(business_data["category"]),
        status=OpportunityStatus.PUBLISHED.value,
        visibility=OpportunityVisibility.PUBLIC.value,
        published_at=now,
        title=str(business_data["opportunity_title"]),
        original_description=str(business_data["opportunity_description"]),
        problem_statement=str(business_data["opportunity_description"]),
        industry=str(business_data["industry"]),
        required_skills_and_resources=list(business_data["required"]),
        provenance={"original_description": ProvenanceCategory.USER_PROVIDED.value},
        ai_metadata={"source": "LOCAL_DEMO_FIXTURE", "synthetic": True},
    )
    db.add(opportunity)
    db.flush()
    return opportunity


def _get_or_create_offering_opportunity(
    db: Session, user: User, account: dict[str, object], now: datetime
) -> Opportunity:
    opportunity_data = SOLVER_OPPORTUNITIES[user.id]
    opportunity_id = f"demo_opportunity_{user.id.removeprefix('demo_solver_')}"
    opportunity = db.get(Opportunity, opportunity_id)
    if opportunity:
        if opportunity.user_id != user.id:
            raise ValueError(f"Demo opportunity ID conflict: {opportunity_id}.")
        return opportunity

    opportunity = Opportunity(
        id=opportunity_id,
        user_id=user.id,
        submission_type=OpportunityType.IDEA.value,
        intent=OpportunityIntent.OFFERING_SOLUTION.value,
        category=str(opportunity_data["category"]),
        status=OpportunityStatus.PUBLISHED.value,
        visibility=OpportunityVisibility.PUBLIC.value,
        published_at=now,
        title=str(opportunity_data["title"]),
        original_description=str(opportunity_data["description"]),
        proposed_solution=str(opportunity_data["description"]),
        industry=str(opportunity_data["industry"]),
        required_skills_and_resources=list(opportunity_data["capabilities"]),
        provenance={"original_description": ProvenanceCategory.USER_PROVIDED.value},
        ai_metadata={"source": "LOCAL_DEMO_FIXTURE", "synthetic": True},
    )
    db.add(opportunity)
    db.flush()
    return opportunity


def _create_ready_sandbox_room(
    db: Session, *, payer: User, payee: User, business: Business, now: datetime
) -> None:
    opportunity = db.get(Opportunity, DEMO_OPPORTUNITY_ID)
    if opportunity is None:
        raise RuntimeError("The demo payer opportunity was not created.")

    amount = Decimal("25.00")
    milestone_terms = {
        "id": DEMO_MILESTONE_ID,
        "title": "Demo integration plan",
        "description": "A fictional starter deliverable for Sandbox checkout testing.",
        "amount": str(amount),
        "currency": "USD",
        "due_days": 7,
        "payer_user_id": payer.id,
        "payee_user_id": payee.id,
    }

    connection = db.get(Connection, DEMO_CONNECTION_ID)
    if connection is None:
        connection = Connection(
            id=DEMO_CONNECTION_ID,
            requester_id=payee.id,
            recipient_id=payer.id,
            opportunity_id=opportunity.id,
            business_id=business.id,
            status=ConnectionStatus.ACCEPTED.value,
            intent=ConnectionIntent.OFFER_CAPABILITY.value,
            message="Fictional seeded collaboration for local workflow testing.",
            response_note="Fictional seeded acceptance for local workflow testing.",
            accepted_at=now,
        )
        db.add(connection)
        db.flush()

    proposal = db.get(Proposal, DEMO_PROPOSAL_ID)
    if proposal is None:
        proposal = Proposal(
            id=DEMO_PROPOSAL_ID,
            connection_id=connection.id,
            opportunity_id=opportunity.id,
            proposer_id=payee.id,
            recipient_id=payer.id,
            status=ProposalStatus.ACCEPTED.value,
            current_version=1,
            accepted_version=1,
            title="Demo inventory integration agreement",
            description="Fictional agreement included only to exercise the local workflow.",
            scope_of_work="Prepare a short integration plan for the demo inventory workflow.",
            deliverables=["Integration plan"],
            budget_amount=amount,
            currency="USD",
            timeline_summary="One demo milestone",
            estimated_duration_days=7,
            milestones=[milestone_terms],
            responsibilities={"payer_user_id": payer.id, "payee_user_id": payee.id},
            assumptions=[],
            conditions=["Sandbox payment testing only."],
            proposer_accepted_at=now,
            recipient_accepted_at=now,
        )
        db.add(proposal)
        db.flush()
        db.add(
            ProposalRevision(
                proposal_id=proposal.id,
                version=1,
                created_by_id=payee.id,
                title=proposal.title,
                description=proposal.description,
                scope_of_work=proposal.scope_of_work,
                deliverables=proposal.deliverables,
                budget_amount=amount,
                currency="USD",
                milestones=[milestone_terms],
                responsibilities=proposal.responsibilities,
                assumptions=[],
                conditions=proposal.conditions,
                change_summary="Fictional local demo agreement.",
            )
        )
        db.flush()

    room = db.get(DealRoom, DEMO_ROOM_ID)
    if room is None:
        room = DealRoom(
            id=DEMO_ROOM_ID,
            proposal_id=proposal.id,
            connection_id=connection.id,
            opportunity_id=opportunity.id,
            title=proposal.title,
            description=proposal.description,
            status=DealRoomStatus.ACTIVE.value,
            accepted_proposal_version=1,
            agreed_scope_of_work=proposal.scope_of_work,
            agreed_deliverables=proposal.deliverables,
            agreed_budget_amount=amount,
            agreed_currency="USD",
            agreed_timeline_summary=proposal.timeline_summary,
            agreed_estimated_duration_days=7,
            agreed_milestones=[milestone_terms],
            agreed_responsibilities={"payer_user_id": payer.id, "payee_user_id": payee.id},
            agreed_conditions=["Sandbox payment testing only."],
        )
        db.add(room)
        db.flush()
        db.add_all(
            [
                DealRoomParticipant(
                    room_id=room.id,
                    user_id=payer.id,
                    collaboration_role="Demo payer",
                    assigned_responsibilities="Fictional payer for Sandbox testing.",
                ),
                DealRoomParticipant(
                    room_id=room.id,
                    user_id=payee.id,
                    collaboration_role="Demo solver",
                    assigned_responsibilities="Fictional solver for Sandbox testing.",
                ),
            ]
        )
        db.flush()

    milestone = db.get(MilestoneExecution, DEMO_MILESTONE_ID)
    if milestone is None:
        milestone = MilestoneExecution(
            id=DEMO_MILESTONE_ID,
            room_id=room.id,
            source_proposal_id=proposal.id,
            accepted_proposal_version=1,
            milestone_index=0,
            title=str(milestone_terms["title"]),
            description=str(milestone_terms["description"]),
            expected_deliverables=["Integration plan"],
            agreed_amount=amount,
            currency="USD",
            due_days=7,
            responsible_user_id=payee.id,
            reviewer_user_id=payer.id,
            status=MilestoneExecutionStatus.APPROVED.value,
            payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
            started_at=now,
            submitted_at=now,
            approved_at=now,
        )
        db.add(milestone)
        db.flush()
        evidence = MilestoneEvidence(
            id="demo_evidence_northstar_priya",
            milestone_id=milestone.id,
            room_id=room.id,
            submitted_by_id=payee.id,
            submission_version=1,
            title="Demo integration plan",
            description="Synthetic evidence row for exercising the approved-milestone flow.",
            evidence_type=MilestoneEvidenceType.OTHER.value,
            reference_url="https://example.test/opnly-demo-evidence",
            status=EvidenceReviewStatus.APPROVED.value,
            submission_notes="Fictional local demo evidence.",
        )
        db.add(evidence)
        db.flush()
        milestone.current_evidence_submission_id = evidence.id
        db.add(
            MilestoneReview(
                milestone_id=milestone.id,
                evidence_id=evidence.id,
                evidence_version=1,
                reviewer_id=payer.id,
                decision=MilestoneReviewDecision.APPROVED.value,
                comments="Fictional local demo approval.",
            )
        )
        db.flush()

    PaymentService(db).prepare_milestone_settlement(
        caller_user_id=payer.id,
        room_id=room.id,
        milestone_id=milestone.id,
        idempotency_key="demo_prep_northstar_priya_v1",
        description="Demo Sandbox milestone settlement",
    )


def validate_local_seed_environment(
    *,
    confirmed: bool,
    app_env: str,
    database_url: str,
    paypal_environment: str,
    paypal_base_url: str,
    paypal_client_id: str,
    paypal_client_secret: str,
) -> None:
    if not confirmed:
        raise ValueError("Pass --confirm-local-demo-seed to create the demo fixture.")
    if app_env.strip().lower() not in {"development", "local", "test"}:
        raise ValueError("Demo data can only be seeded when APP_ENV is development, local, or test.")

    parsed = urlparse(database_url)
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    local_sqlite = parsed.scheme.startswith("sqlite")
    if not local_sqlite and parsed.hostname not in local_hosts:
        raise ValueError("The demo seeder only permits a local database host.")
    database_name = parsed.path.rsplit("/", 1)[-1].lower()
    if any(marker in database_name for marker in ("prod", "production", "live")):
        raise ValueError("The demo seeder refuses a production/live database name.")

    if paypal_environment.strip().lower() != "sandbox":
        raise ValueError("Sandbox fixture setup requires PAYPAL_ENVIRONMENT=sandbox.")
    if urlparse(paypal_base_url).hostname != "api-m.sandbox.paypal.com":
        raise ValueError("Sandbox fixture setup requires the PayPal Sandbox API URL.")
    if not paypal_client_id.strip() or not paypal_client_secret.strip():
        raise ValueError("Configure local PayPal Sandbox credentials before seeding.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirm-local-demo-seed",
        action="store_true",
        help="Create fictional accounts and workflows in a local development database.",
    )
    args = parser.parse_args()
    if not args.confirm_local_demo_seed:
        print(
            "No data changed. Review the local-only safety checks and rerun with "
            "--confirm-local-demo-seed to continue."
        )
        return

    try:
        validate_local_seed_environment(
            confirmed=args.confirm_local_demo_seed,
            app_env=settings.APP_ENV,
            database_url=settings.DATABASE_URL,
            paypal_environment=settings.PAYPAL_ENVIRONMENT,
            paypal_base_url=settings.PAYPAL_BASE_URL,
            paypal_client_id=settings.PAYPAL_CLIENT_ID,
            paypal_client_secret=settings.PAYPAL_CLIENT_SECRET,
        )
    except ValueError as exc:
        parser.error(str(exc))

    password = os.environ.get(DEMO_PASSWORD_ENV, "")
    if len(password) < 12:
        parser.error(f"Set {DEMO_PASSWORD_ENV} to a password of at least 12 characters.")

    with SessionLocal() as db:
        try:
            summary = seed_demo_data(db, password)
        except Exception:
            db.rollback()
            raise

    print("Created or preserved fictional local demo accounts:")
    for email in summary.accounts:
        print(f"  {email}")
    print(f"Shared demo password: value of {DEMO_PASSWORD_ENV} (not printed)")
    print(f"Sandbox Deal Room: {summary.sandbox_room_id}")
    print(f"Sandbox milestone: {summary.sandbox_milestone_id} ($25.00 USD)")
    print("No PayPal order or payment was created. Checkout requires your explicit action.")


if __name__ == "__main__":
    main()
