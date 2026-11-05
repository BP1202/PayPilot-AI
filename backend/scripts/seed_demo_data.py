"""PayPilot AI — Database Demo Seeding Script.

Seeds 3 test accounts with complete opportunity-to-business records:
1. Alice Architect (Developer / Service Provider) -> alice@paypilot.ai / Password123!
2. Bob Founder (Startup Founder / Problem Owner) -> bob@paypilot.ai / Password123!
3. Carol Designer (UI/UX & Design Specialist) -> carol@paypilot.ai / Password123!

Includes:
- Public individual profiles with skills, experience, and services.
- Published opportunities across Fintech and Tech categories.
- Accepted connection between Alice and Bob.
- Accepted proposal ($10,000.00 USD) with milestone breakdown.
- Active AI Deal Room collaboration workspace with notes, clarifications, and documents.
- 3 Execution milestones demonstrating:
    - Milestone 1: APPROVED with payment readiness READY_FOR_PAYMENT_REVIEW.
    - Milestone 2: SUBMITTED_FOR_REVIEW with evidence v1 pending Bob's review.
    - Milestone 3: NOT_STARTED.
"""

import os
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.connection import Connection, ConnectionIntent, ConnectionStatus
from app.models.deal_room import (
    DealRoom,
    DealRoomActivity,
    DealRoomActivityType,
    DealRoomClarification,
    DealRoomClarificationStatus,
    DealRoomDocument,
    DealRoomDocumentType,
    DealRoomNote,
    DealRoomParticipant,
    DealRoomStatus,
)
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


def seed_demo_data() -> None:
    with SessionLocal() as db:
        print("[*] Seeding PayPilot AI demo test accounts and lifecycle records...")
        now = datetime.now(UTC)
        default_pwd_hash = hash_password("Password123!")

        # ---------------------------------------------------------------------
        # 1. Test Users & Profiles
        # ---------------------------------------------------------------------
        users_meta = [
            {
                "id": "usr_demo_alice",
                "email": "alice@paypilot.ai",
                "full_name": "Alice Architect",
                "headline": "Principal Cloud Architect & AI Engineer",
                "bio": "Specializing in distributed fintech architectures, AI orchestration, and high-throughput transaction pipelines.",
                "location": "San Francisco, CA",
                "industry": "Fintech & Cloud Systems",
                "skills": ["Python", "FastAPI", "React", "Next.js", "PostgreSQL", "System Architecture", "Cloud Infrastructure"],
                "services": ["AI Architecture Consulting", "Full-Stack Development", "Technical Due Diligence"],
                "interests": ["Fintech", "Payment Networks", "Distributed Systems", "AI Agentic Workflows"],
            },
            {
                "id": "usr_demo_bob",
                "email": "bob@paypilot.ai",
                "full_name": "Bob Founder",
                "headline": "Fintech Founder & Product Executive",
                "bio": "Building next-generation B2B commercial tools and opportunity networks. 10+ years scaling fintech products.",
                "location": "New York, NY",
                "industry": "Fintech & B2B SaaS",
                "skills": ["Product Strategy", "Fintech Compliance", "Commercialization", "B2B SaaS", "Roadmapping"],
                "services": ["Product Strategy", "Venture Advisory", "Commercial Partnerships"],
                "interests": ["Automated Reconciliation", "Opportunity Networks", "Cross-Border Settlement"],
            },
            {
                "id": "usr_demo_carol",
                "email": "carol@paypilot.ai",
                "full_name": "Carol Designer",
                "headline": "Senior Product & Design Systems Lead",
                "bio": "Passionate about building intuitive, enterprise-grade design systems and user-centric financial interfaces.",
                "location": "Austin, TX",
                "industry": "Design & Product Tech",
                "skills": ["UI/UX Design", "Figma", "Design Systems", "User Research", "Frontend Prototyping"],
                "services": ["Design Systems Architecture", "Product UI/UX Audits", "Rapid Prototyping"],
                "interests": ["Accessible Design", "Design Tokens", "Modern Web UX"],
            },
        ]

        created_users = {}
        for meta in users_meta:
            user = db.query(User).filter(User.email == meta["email"]).first()
            if not user:
                user = User(
                    id=meta["id"],
                    email=meta["email"],
                    hashed_password=default_pwd_hash,
                    full_name=meta["full_name"],
                    is_active=True,
                )
                db.add(user)
                db.flush()
                print(f"  + User created: {user.email}")
            else:
                user.full_name = meta["full_name"]
                user.hashed_password = default_pwd_hash
                user.is_active = True
                print(f"  * User updated: {user.email}")
            created_users[meta["email"]] = user

            # Profile
            profile = db.query(IndividualProfile).filter(IndividualProfile.user_id == user.id).first()
            if not profile:
                profile = IndividualProfile(
                    user_id=user.id,
                    headline=meta["headline"],
                    bio=meta["bio"],
                    location=meta["location"],
                    industry=meta["industry"],
                    skills=meta["skills"],
                    services=meta["services"],
                    interests=meta["interests"],
                    visibility=ProfileVisibility.PUBLIC.value,
                )
                db.add(profile)
                print(f"  + Profile created: {user.email}")
            else:
                profile.headline = meta["headline"]
                profile.bio = meta["bio"]
                profile.location = meta["location"]
                profile.industry = meta["industry"]
                profile.skills = meta["skills"]
                profile.services = meta["services"]
                profile.interests = meta["interests"]
                profile.visibility = ProfileVisibility.PUBLIC.value
                print(f"  * Profile updated: {user.email}")

        alice = created_users["alice@paypilot.ai"]
        bob = created_users["bob@paypilot.ai"]
        carol = created_users["carol@paypilot.ai"]

        # ---------------------------------------------------------------------
        # 2. Sample Opportunities
        # ---------------------------------------------------------------------
        opp_data = [
            {
                "id": "opp_demo_ai_recon",
                "user_id": bob.id,
                "title": "AI Financial Reconciliation Engine",
                "submission_type": OpportunityType.PROBLEM.value,
                "intent": OpportunityIntent.SEEKING_SOLUTION.value,
                "category": OpportunityCategory.FINTECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=5),
                "original_description": "We need an automated reconciliation engine that matches high-volume multi-currency ledger entries with bank transaction feeds and flags discrepancies.",
                "problem_statement": "Manual accounting reconciliation for B2B cross-border settlements takes 15+ hours weekly, creating delayed ledger balancing.",
                "proposed_solution": "Deploy a containerized FastAPI reconciliation engine with rule-based and AI fuzzy matching capabilities.",
                "industry": "Fintech & Accounting",
                "value_proposition": "Cut reconciliation latency by 90% and prevent financial discrepancy leakage.",
                "target_customer_segments": ["Mid-Market Fintechs", "Cross-Border Marketplaces", "Digital Banks"],
                "customer_pain_points": ["Manual spreadsheet reconciliation", "Delayed month-end close", "Unmatched transaction errors"],
                "required_skills_and_resources": ["Python", "FastAPI", "PostgreSQL", "Financial Data Pipelines", "AI Matching"],
                "potential_business_models": ["SaaS Subscription", "Volume-Based API Usage"],
                "key_assumptions": ["Bank transaction feeds available via standard CSV/API", "Tolerable discrepancy window is within 48 hours"],
                "risks_and_uncertainties": ["Bank feed schema variability", "High volume peak load concurrency"],
                "missing_information": ["Target batch processing window (real-time vs 6-hour batch)"],
                "suggested_follow_up_questions": ["What is the expected daily transaction volume?"],
                "provenance": {
                    "problem_statement": ProvenanceCategory.USER_PROVIDED.value,
                    "proposed_solution": ProvenanceCategory.AI_SUGGESTION.value,
                    "value_proposition": ProvenanceCategory.AI_HYPOTHESIS.value,
                },
                "ai_metadata": {"provider": "google-gemini", "model": "gemini-1.5-flash", "confidence": 0.94, "mode": "LIVE_AI"},
            },
            {
                "id": "opp_demo_fraud_guard",
                "user_id": alice.id,
                "title": "Real-Time Fraud Pattern Recognition Pipeline",
                "submission_type": OpportunityType.IDEA.value,
                "intent": OpportunityIntent.OFFERING_SOLUTION.value,
                "category": OpportunityCategory.FINTECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=3),
                "original_description": "Pre-built anomaly detection pipeline for payment flows and commercial deal room interactions.",
                "problem_statement": "Online commercial transactions are vulnerable to synthetic identity attacks and duplicate invoice fraud.",
                "proposed_solution": "Lightweight inference pipeline combining rule heuristics with embedding distance anomaly checks.",
                "industry": "Fintech & Cybersecurity",
                "value_proposition": "Stop duplicate and suspicious payment releases before irreversible execution.",
                "target_customer_segments": ["Payment Facilitators", "B2B Deal Networks"],
                "customer_pain_points": ["Payment disputes", "Fraudulent invoices"],
                "required_skills_and_resources": ["Python", "Kafka", "PostgreSQL", "Machine Learning"],
                "potential_business_models": ["Per-Transaction Fee", "Enterprise License"],
                "key_assumptions": ["Transaction latency budget is under 150ms"],
                "risks_and_uncertainties": ["False positive rate during initial warm-up"],
                "missing_information": [],
                "suggested_follow_up_questions": [],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"provider": "google-gemini", "model": "gemini-1.5-flash", "confidence": 0.91, "mode": "LIVE_AI"},
            },
            {
                "id": "opp_demo_design_sys",
                "user_id": carol.id,
                "title": "Accessible Design System for Financial Products",
                "submission_type": OpportunityType.IDEA.value,
                "intent": OpportunityIntent.OFFERING_SOLUTION.value,
                "category": OpportunityCategory.TECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=1),
                "original_description": "High-converting, WCAG AAA compliant design system and component kit tailored for fintech and commerce apps.",
                "problem_statement": "Most commercial products suffer from fragmented UI components, poor accessibility, and slow frontend iteration cycles.",
                "proposed_solution": "A modern Tailwind + React component system with accessible primitives, financial charts, and dark mode.",
                "industry": "Design Systems",
                "value_proposition": "Accelerate product delivery by 3x while ensuring 100% accessibility compliance.",
                "target_customer_segments": ["Fintech Startups", "Developer Teams"],
                "customer_pain_points": ["Inconsistent UI", "Accessibility compliance audits"],
                "required_skills_and_resources": ["Figma", "React", "Tailwind CSS", "WCAG 2.1 Guidelines"],
                "potential_business_models": ["Productized Service", "One-Time Asset License"],
                "key_assumptions": ["Tech stack uses modern React/Next.js"],
                "risks_and_uncertainties": [],
                "missing_information": [],
                "suggested_follow_up_questions": [],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"provider": "google-gemini", "model": "gemini-1.5-flash", "confidence": 0.95, "mode": "LIVE_AI"},
            },
        ]

        for item in opp_data:
            opp = db.query(Opportunity).filter(Opportunity.id == item["id"]).first()
            if not opp:
                opp = Opportunity(**item)
                db.add(opp)
                print(f"  + Opportunity created: {opp.title}")
            else:
                for k, v in item.items():
                    setattr(opp, k, v)
                print(f"  * Opportunity updated: {opp.title}")
        db.flush()

        # ---------------------------------------------------------------------
        # 3. Connection: Alice Architect & Bob Founder
        # ---------------------------------------------------------------------
        conn_id = "conn_demo_alice_bob"
        conn = db.query(Connection).filter(Connection.id == conn_id).first()
        if not conn:
            conn = Connection(
                id=conn_id,
                requester_id=alice.id,
                recipient_id=bob.id,
                opportunity_id="opp_demo_ai_recon",
                status=ConnectionStatus.ACCEPTED.value,
                intent=ConnectionIntent.OFFER_CAPABILITY.value,
                message="Hi Bob! I reviewed your Financial Reconciliation problem. I have built similar automated pipeline engines and would love to collaborate on the core architecture.",
                response_note="Hi Alice, your architecture background is exactly what we need. Looking forward to discussing proposal terms!",
                accepted_at=now - timedelta(days=4),
            )
            db.add(conn)
            print("  + Connection created: Alice <-> Bob (ACCEPTED)")
        else:
            conn.status = ConnectionStatus.ACCEPTED.value
            conn.accepted_at = now - timedelta(days=4)
            print("  * Connection updated: Alice <-> Bob (ACCEPTED)")
        db.flush()

        # ---------------------------------------------------------------------
        # 4. Accepted Proposal
        # ---------------------------------------------------------------------
        prop_id = "prop_demo_ai_recon"
        agreed_milestones_data = [
            {
                "title": "Stage 1: Core Architecture & Ingestion Pipeline",
                "description": "Deliver modular FastAPI service, PostgreSQL schema, and automated ingestion of multi-currency ledger CSV feeds.",
                "amount": "3000.00",
                "due_days": 14,
            },
            {
                "title": "Stage 2: Fuzzy Reconciliation & Rule Engine",
                "description": "Implement matching heuristics, tolerance window filters, and discrepancy flagging mechanisms.",
                "amount": "4000.00",
                "due_days": 21,
            },
            {
                "title": "Stage 3: Integration Verification & Production Handover",
                "description": "Deliver comprehensive integration test suite, performance benchmarks, and deployment documentation.",
                "amount": "3000.00",
                "due_days": 14,
            },
        ]

        prop = db.query(Proposal).filter(Proposal.id == prop_id).first()
        if not prop:
            prop = Proposal(
                id=prop_id,
                connection_id=conn.id,
                opportunity_id="opp_demo_ai_recon",
                proposer_id=alice.id,
                recipient_id=bob.id,
                status=ProposalStatus.ACCEPTED.value,
                current_version=1,
                title="AI Financial Reconciliation Core Service",
                description="Engineering agreement to architect, build, and deploy an automated financial reconciliation engine.",
                scope_of_work="Architect, develop, and deliver a production-ready reconciliation engine that handles multi-currency transactions, bank feed ingestion, and automated discrepancy reporting.",
                deliverables=[
                    "FastAPI Core Ingestion Service",
                    "PostgreSQL Schema & Migration Scripts",
                    "Fuzzy Matching & Rule-Based Reconciliation Engine",
                    "Comprehensive Pytest Integration Suite (>90% coverage)",
                    "Docker Deployment Configuration & API Docs",
                ],
                budget_amount=Decimal("10000.00"),
                currency="USD",
                timeline_summary="7 weeks agile delivery in 3 execution milestones",
                estimated_duration_days=49,
                milestones=agreed_milestones_data,
                responsibilities={
                    "proposer": "Lead technical architecture, service development, and API integration testing",
                    "recipient": "Provide sample bank transaction feeds, review deliverables, and approve milestone completions",
                },
                assumptions=[
                    "Bank feeds conform to standard ISO multi-currency format",
                    "Deployment targets standard Linux Docker environment",
                ],
                conditions=[
                    "Milestone deliverable reviews completed within 5 business days",
                    "Verified approvals initiate payment review",
                ],
                notes="Weekly technical sprint reviews on Thursdays at 4 PM UTC.",
                proposer_accepted_at=now - timedelta(days=3),
                recipient_accepted_at=now - timedelta(days=3),
                accepted_version=1,
            )
            db.add(prop)
            print("  + Proposal created: prop_demo_ai_recon (ACCEPTED)")
        else:
            prop.status = ProposalStatus.ACCEPTED.value
            prop.proposer_accepted_at = now - timedelta(days=3)
            prop.recipient_accepted_at = now - timedelta(days=3)
            prop.accepted_version = 1
            print("  * Proposal updated: prop_demo_ai_recon (ACCEPTED)")
        db.flush()

        # Proposal Revision record
        rev = db.query(ProposalRevision).filter(ProposalRevision.proposal_id == prop.id, ProposalRevision.version == 1).first()
        if not rev:
            rev = ProposalRevision(
                proposal_id=prop.id,
                version=1,
                created_by_id=alice.id,
                title=prop.title,
                description=prop.description,
                scope_of_work=prop.scope_of_work,
                deliverables=prop.deliverables,
                budget_amount=prop.budget_amount,
                currency=prop.currency,
                milestones=prop.milestones,
                responsibilities=prop.responsibilities,
                assumptions=prop.assumptions,
                conditions=prop.conditions,
                notes=prop.notes,
                change_summary="Initial proposal draft accepted by both parties",
            )
            db.add(rev)
            db.flush()

        # ---------------------------------------------------------------------
        # 5. Deal Room
        # ---------------------------------------------------------------------
        room_id = "room_demo_ai_recon"
        room = db.query(DealRoom).filter(DealRoom.id == room_id).first()
        if not room:
            room = DealRoom(
                id=room_id,
                proposal_id=prop.id,
                connection_id=conn.id,
                opportunity_id=prop.opportunity_id,
                title=prop.title,
                description=prop.description,
                status=DealRoomStatus.ACTIVE.value,
                accepted_proposal_version=1,
                agreed_scope_of_work=prop.scope_of_work,
                agreed_deliverables=prop.deliverables,
                agreed_budget_amount=prop.budget_amount,
                agreed_currency=prop.currency,
                agreed_timeline_summary=prop.timeline_summary,
                agreed_estimated_duration_days=prop.estimated_duration_days,
                agreed_milestones=prop.milestones,
                agreed_responsibilities=prop.responsibilities,
                agreed_assumptions=prop.assumptions,
                agreed_conditions=prop.conditions,
                agreed_notes=prop.notes,
            )
            db.add(room)
            db.flush()
            print("  + Deal Room created: room_demo_ai_recon (ACTIVE)")

            # Participants
            p1 = DealRoomParticipant(
                room_id=room.id,
                user_id=alice.id,
                collaboration_role="Proposer / Lead Architect",
                assigned_responsibilities="Lead technical architecture, service development, and API integration testing",
            )
            p2 = DealRoomParticipant(
                room_id=room.id,
                user_id=bob.id,
                collaboration_role="Counterpart / Product Lead",
                assigned_responsibilities="Provide sample bank transaction feeds, review deliverables, and approve milestone completions",
            )
            db.add_all([p1, p2])

            # Activity
            act1 = DealRoomActivity(
                room_id=room.id,
                actor_id=bob.id,
                activity_type=DealRoomActivityType.ROOM_CREATED.value,
                title="Deal Room Created",
                details="Collaboration workspace established from accepted proposal v1.",
            )
            db.add(act1)

            # Note
            note1 = DealRoomNote(
                room_id=room.id,
                author_id=alice.id,
                title="API Contracts & OpenAPI Schema Draft",
                content="Initial draft of the reconciliation models and endpoints is ready for review in the swagger preview link.",
                is_pinned=True,
            )
            db.add(note1)

            # Clarification
            clar1 = DealRoomClarification(
                room_id=room.id,
                asked_by_id=alice.id,
                question="Could you confirm the maximum tolerance for timestamp drift on currency conversions (e.g. 24h vs 48h)?",
                status=DealRoomClarificationStatus.RESOLVED.value,
                answered_by_id=bob.id,
                answer="48 hours is acceptable for international weekend settlements.",
                answered_at=now - timedelta(days=2),
            )
            db.add(clar1)

            # Document
            doc1 = DealRoomDocument(
                room_id=room.id,
                uploaded_by_id=alice.id,
                title="OpenAPI 3.1 Reconciliation Engine Specification",
                document_type=DealRoomDocumentType.SPECIFICATION.value,
                reference_url="https://paypilot.ai/docs/api/reconciliation",
                description="Live OpenAPI schema defining batch ingestion, status checks, and discrepancy reports.",
            )
            db.add(doc1)
            db.flush()
        else:
            print("  * Deal Room room_demo_ai_recon verified.")

        # ---------------------------------------------------------------------
        # 6. Deal Room Milestones Execution & Evidence
        # ---------------------------------------------------------------------
        ms1 = db.query(MilestoneExecution).filter(
            MilestoneExecution.room_id == room.id,
            MilestoneExecution.milestone_index == 0,
        ).first()

        if not ms1:
            ms1 = MilestoneExecution(
                room_id=room.id,
                source_proposal_id=prop.id,
                accepted_proposal_version=1,
                milestone_index=0,
                title="Stage 1: Core Architecture & Ingestion Pipeline",
                description="Deliver modular FastAPI service, PostgreSQL schema, and automated ingestion of multi-currency ledger CSV feeds.",
                expected_deliverables=["FastAPI Core Ingestion Service", "PostgreSQL Schema & Migration Scripts"],
                agreed_amount=Decimal("3000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=alice.id,
                reviewer_user_id=bob.id,
                status=MilestoneExecutionStatus.APPROVED.value,
                payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
                started_at=now - timedelta(days=3),
                submitted_at=now - timedelta(days=2),
                approved_at=now - timedelta(days=1),
            )
            db.add(ms1)
            db.flush()

            ev1 = MilestoneEvidence(
                milestone_id=ms1.id,
                room_id=room.id,
                submitted_by_id=alice.id,
                submission_version=1,
                title="FastAPI Core Ingestion Engine v1.0",
                description="Completed the core FastAPI ingestion endpoints with comprehensive test coverage, Docker Compose file, and database migrations.",
                evidence_type=MilestoneEvidenceType.CODE_REPOSITORY.value,
                reference_url="https://github.com/paypilot/reconciliation-engine",
                attachments=[{"type": "link", "url": "https://github.com/paypilot/reconciliation-engine/releases/tag/v1.0.0"}],
                status=EvidenceReviewStatus.APPROVED.value,
            )
            db.add(ev1)
            db.flush()

            rev1 = MilestoneReview(
                milestone_id=ms1.id,
                evidence_id=ev1.id,
                evidence_version=1,
                reviewer_id=bob.id,
                decision=MilestoneReviewDecision.APPROVED.value,
                comments="Code reviewed, tests passing cleanly, and feed ingestion benchmark verified. Approved!",
            )
            db.add(rev1)
            print("  + Milestone 1 created (APPROVED, READY_FOR_PAYMENT_REVIEW)")

        ms2 = db.query(MilestoneExecution).filter(
            MilestoneExecution.room_id == room.id,
            MilestoneExecution.milestone_index == 1,
        ).first()

        if not ms2:
            ms2 = MilestoneExecution(
                room_id=room.id,
                source_proposal_id=prop.id,
                accepted_proposal_version=1,
                milestone_index=1,
                title="Stage 2: Fuzzy Reconciliation & Rule Engine",
                description="Implement matching heuristics, tolerance window filters, and discrepancy flagging mechanisms.",
                expected_deliverables=["Fuzzy Matching & Rule-Based Reconciliation Engine", "Pytest Suite (>90% coverage)"],
                agreed_amount=Decimal("4000.00"),
                currency="USD",
                due_days=21,
                responsible_user_id=alice.id,
                reviewer_user_id=bob.id,
                status=MilestoneExecutionStatus.SUBMITTED_FOR_REVIEW.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
                started_at=now - timedelta(days=1),
                submitted_at=now - timedelta(hours=3),
            )
            db.add(ms2)
            db.flush()

            ev2 = MilestoneEvidence(
                milestone_id=ms2.id,
                room_id=room.id,
                submitted_by_id=alice.id,
                submission_version=1,
                title="Rule Engine & Matching Algorithm Implementation",
                description="Implemented the fuzzy reconciliation service. All unit tests passing with 94% coverage. Ready for counterparty review.",
                evidence_type=MilestoneEvidenceType.CODE_REPOSITORY.value,
                reference_url="https://github.com/paypilot/reconciliation-engine/pull/2",
                attachments=[],
                status=EvidenceReviewStatus.PENDING_REVIEW.value,
            )
            db.add(ev2)
            print("  + Milestone 2 created (SUBMITTED_FOR_REVIEW)")

        ms3 = db.query(MilestoneExecution).filter(
            MilestoneExecution.room_id == room.id,
            MilestoneExecution.milestone_index == 2,
        ).first()

        if not ms3:
            ms3 = MilestoneExecution(
                room_id=room.id,
                source_proposal_id=prop.id,
                accepted_proposal_version=1,
                milestone_index=2,
                title="Stage 3: Integration Verification & Production Handover",
                description="Deliver comprehensive integration test suite, performance benchmarks, and deployment documentation.",
                expected_deliverables=["Deployment Configuration & API Documentation", "Production Runbook"],
                agreed_amount=Decimal("3000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=alice.id,
                reviewer_user_id=bob.id,
                status=MilestoneExecutionStatus.NOT_STARTED.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
            )
            db.add(ms3)
            print("  + Milestone 3 created (NOT_STARTED)")

        db.commit()
        print("\n[SUCCESS] Demo test accounts and sample records are ready!")


if __name__ == "__main__":
    seed_demo_data()
