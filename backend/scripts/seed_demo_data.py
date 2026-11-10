"""Opnly — Production-Grade Demo Seeding Script.

Seeds 2 Seekers and 2 Solvers (distinct authentic personas) plus legacy test accounts
with complete opportunity-to-business records:

Seekers (Need Solutions):
1. Marcus Vance (Enterprise Solutions Director) -> seeker1@opnly.com / Password123!
   - Business: Vance Enterprise Systems
   - Opportunity: Autonomous Enterprise Data Ingestion & Pipeline Orchestration ($15,000 USD)
2. Elena Rostova (BioMed Hardware Founder) -> seeker2@opnly.com / Password123!
   - Business: Rostova BioHealth
   - Opportunity: Portable Biomedical Telemetry Sensor Firmware & BLE Bridge ($12,000 USD)

Solvers (Offer Capabilities):
3. Alex Chen (Principal Distributed Systems Architect) -> solver1@opnly.com / Password123!
   - Business: Chen Cloud Dynamics
   - Opportunity: Distributed High-Concurrency API & Event Streaming Architecture
4. Sarah Jenkins (Senior Embedded & IoT Specialist) -> solver2@opnly.com / Password123!
   - Business: Nexus Firmware Labs
   - Opportunity: Ultra-Low Power IoT Sensor Firmware & Edge Telemetry

Deal Rooms & Collaborations:
- Deal Room 1: Vance Enterprise Systems <-> Alex Chen (Active, $15,000.00 USD)
  - Milestone 1 ($5,000.00): APPROVED, READY_FOR_PAYMENT_REVIEW (with prepared settlement transaction)
  - Milestone 2 ($6,000.00): IN_PROGRESS
  - Milestone 3 ($4,000.00): NOT_STARTED
- Deal Room 2: Rostova BioHealth <-> Sarah Jenkins (Active, $12,000.00 USD)
  - Milestone 1 ($4,000.00): APPROVED, READY_FOR_PAYMENT_REVIEW (with prepared settlement transaction)
  - Milestone 2 ($5,000.00): IN_PROGRESS
  - Milestone 3 ($3,000.00): NOT_STARTED
"""

import os
import sys
from datetime import UTC, datetime, timedelta
from decimal import Decimal

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.business import Business
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
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.user import User


def seed_demo_data() -> None:
    with SessionLocal() as db:
        print("[*] Seeding Opnly 2 Seekers & 2 Solvers lifecycle records...")
        now = datetime.now(UTC)
        default_pwd_hash = hash_password("Password123!")

        # ---------------------------------------------------------------------
        # Clean up legacy demo transactions (TXN-DEMO-202611-001..005)
        # ---------------------------------------------------------------------
        legacy_txs = (
            db.query(Transaction)
            .filter(Transaction.transaction_ref.like("TXN-DEMO-202611%"))
            .all()
        )
        if legacy_txs:
            for tx in legacy_txs:
                db.delete(tx)
            db.flush()
            print(f"  [-] Cleaned up {len(legacy_txs)} legacy demo transactions.")

        # ---------------------------------------------------------------------
        # 1. Authentic Persona Accounts
        # ---------------------------------------------------------------------
        users_meta = [
            # Seeker 1
            {
                "id": "usr_seeker_marcus",
                "email": "seeker1@opnly.com",
                "full_name": "Marcus Vance",
                "headline": "Enterprise Systems Director & Digital Transformation Lead",
                "bio": "Leading enterprise infrastructure modernization at Vance Enterprise Systems. Seeking specialized contractors and engineering partners for mission-critical automation.",
                "location": "Chicago, IL",
                "industry": "Enterprise Software & IT",
                "skills": ["Enterprise Architecture", "Data Governance", "Cloud Infrastructure", "Vendor Management"],
                "services": ["Enterprise Solutions", "Infrastructure Strategy"],
                "interests": ["Automated Data Pipelines", "High-Throughput Ingestion", "Fintech Compliance"],
                "business_name": "Vance Enterprise Systems",
                "business_type": "Enterprise Corporation",
                "business_desc": "Enterprise solutions and data infrastructure systems provider.",
            },
            # Seeker 2
            {
                "id": "usr_seeker_elena",
                "email": "seeker2@opnly.com",
                "full_name": "Elena Rostova",
                "headline": "Biomedical Systems Founder & MedTech Hardware Lead",
                "bio": "Founder of Rostova BioHealth. Developing next-generation clinical biometric monitors and low-power wearable telemetry devices.",
                "location": "Boston, MA",
                "industry": "Healthcare & MedTech",
                "skills": ["Biomedical Engineering", "Medical Device Hardware", "Clinical Trials", "FDA 510(k)"],
                "services": ["Biomedical Innovation", "Wearable Device Design"],
                "interests": ["Embedded Firmware", "Bluetooth Low Energy", "Edge Telemetry", "HIPAA Compliance"],
                "business_name": "Rostova BioHealth",
                "business_type": "MedTech Startup",
                "business_desc": "Clinical wearable biometric systems and diagnostic telemetry hardware.",
            },
            # Solver 1
            {
                "id": "usr_solver_alex",
                "email": "solver1@opnly.com",
                "full_name": "Alex Chen",
                "headline": "Principal Cloud Systems Architect & High-Concurrency Specialist",
                "bio": "12+ years designing distributed backend systems, streaming data pipelines, and mission-critical cloud backends. Creator of Chen Cloud Dynamics.",
                "location": "San Francisco, CA",
                "industry": "Cloud & Distributed Systems",
                "skills": ["Python", "FastAPI", "Go", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "Redis"],
                "services": ["Distributed Architecture Consulting", "High-Throughput API Engineering", "Cloud Migration"],
                "interests": ["Event-Driven Systems", "Autonomous Pipelines", "Fintech Rails"],
                "business_name": "Chen Cloud Dynamics",
                "business_type": "Engineering Consultancy",
                "business_desc": "Specialized distributed systems and streaming data pipeline engineering.",
            },
            # Solver 2
            {
                "id": "usr_solver_sarah",
                "email": "solver2@opnly.com",
                "full_name": "Sarah Jenkins",
                "headline": "Senior Embedded Firmware Engineer & IoT Hardware Specialist",
                "bio": "Specialized in micro-power embedded systems, FreeRTOS, Bluetooth Low Energy, and secure device-to-cloud telemetry.",
                "location": "Boulder, CO",
                "industry": "Embedded Systems & IoT",
                "skills": ["C", "C++", "FreeRTOS", "BLE / Nordic nRF", "ARM Cortex-M", "PCB Bring-up", "Low Power"],
                "services": ["Firmware Architecture", "BLE Protocol Design", "Embedded Linux Development"],
                "interests": ["Biomedical Hardware", "Ultra-Low Power", "Edge Computing"],
                "business_name": "Nexus Firmware Labs",
                "business_type": "Hardware & Firmware Studio",
                "business_desc": "Low-power embedded systems and medical IoT firmware development.",
            },
            # Legacy test accounts for continuity
            {
                "id": "usr_demo_alice",
                "email": "alice@paypilot.ai",
                "full_name": "Alice Architect",
                "headline": "Principal Cloud Architect & AI Engineer",
                "bio": "Specializing in distributed fintech architectures, AI orchestration, and high-throughput pipelines.",
                "location": "San Francisco, CA",
                "industry": "Fintech & Cloud Systems",
                "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
                "services": ["AI Architecture Consulting", "Full-Stack Development"],
                "interests": ["Fintech", "Payment Networks"],
                "business_name": "Alice Architecture Works",
                "business_type": "Studio",
                "business_desc": "Fintech systems architecture.",
            },
            {
                "id": "usr_demo_bob",
                "email": "bob@paypilot.ai",
                "full_name": "Bob Founder",
                "headline": "Fintech Founder & Product Executive",
                "bio": "Building next-generation commercial tools and opportunity networks.",
                "location": "New York, NY",
                "industry": "Fintech & B2B SaaS",
                "skills": ["Product Strategy", "Fintech Compliance"],
                "services": ["Product Strategy"],
                "interests": ["Automated Reconciliation"],
                "business_name": "Bob Ventures",
                "business_type": "Startup",
                "business_desc": "Commercial fintech solutions.",
            },
        ]

        created_users = {}
        created_businesses = {}
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
            profile = (
                db.query(IndividualProfile)
                .filter(IndividualProfile.user_id == user.id)
                .first()
            )
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

            # Business Record
            biz = (
                db.query(Business)
                .filter(Business.user_id == user.id)
                .first()
            )
            if not biz:
                biz = Business(
                    name=meta["business_name"],
                    currency="USD",
                    industry=meta["industry"],
                    business_type=meta["business_type"],
                    country="United States",
                    location=meta["location"],
                    website=f"https://{meta['business_name'].lower().replace(' ', '')}.com",
                    description=meta["business_desc"],
                    user_id=user.id,
                    visibility="PUBLIC",
                    skills=meta["skills"],
                    services=meta["services"],
                    interests=meta["interests"],
                )
                db.add(biz)
                db.flush()
                print(f"  + Business created: {biz.name} (user_id={user.id})")
            else:
                biz.name = meta["business_name"]
                biz.description = meta["business_desc"]
                biz.industry = meta["industry"]
                biz.business_type = meta["business_type"]
                biz.currency = "USD"
            created_businesses[meta["email"]] = biz

        marcus = created_users["seeker1@opnly.com"]
        elena = created_users["seeker2@opnly.com"]
        alex = created_users["solver1@opnly.com"]
        sarah = created_users["solver2@opnly.com"]

        marcus_biz = created_businesses["seeker1@opnly.com"]
        elena_biz = created_businesses["seeker2@opnly.com"]
        alex_biz = created_businesses["solver1@opnly.com"]
        sarah_biz = created_businesses["solver2@opnly.com"]

        # ---------------------------------------------------------------------
        # 2. Opportunities (2 Seeking + 2 Offering)
        # ---------------------------------------------------------------------
        opp_data = [
            # Seeker 1 Opportunity
            {
                "id": "opp_vance_pipeline",
                "user_id": marcus.id,
                "business_id": marcus_biz.id,
                "title": "Autonomous Enterprise Data Ingestion & Pipeline Orchestration",
                "submission_type": OpportunityType.PROBLEM.value,
                "intent": OpportunityIntent.SEEKING_SOLUTION.value,
                "category": OpportunityCategory.TECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=6),
                "original_description": "We need a fault-tolerant streaming ingestion engine capable of processing 50k events/sec across ERP and ledger endpoints.",
                "problem_statement": "Legacy batch processing creates a 6-hour data lag across inventory and billing ledgers, causing frequent allocation discrepancies.",
                "proposed_solution": "Deploy a distributed FastAPI + Kafka data plane with automated schema validation and idempotency protection.",
                "industry": "Enterprise Software",
                "value_proposition": "Eliminate 6-hour reconciliation lag, providing sub-second ledger accuracy and reducing order processing discrepancies by 95%.",
                "target_customer_segments": ["Supply Chain Enterprises", "Automated Logistics Networks"],
                "customer_pain_points": ["Delayed batch updates", "Duplicate transactions", "Data sync failures"],
                "required_skills_and_resources": ["Python", "FastAPI", "Kafka", "PostgreSQL", "Distributed Systems"],
                "potential_business_models": ["Fixed-Price Commercial Agreement", "Retainer Support"],
                "key_assumptions": ["ERP supports REST/Webhook streams", "Cloud VPC latency is under 20ms"],
                "risks_and_uncertainties": ["Upstream legacy rate limits"],
                "missing_information": [],
                "suggested_follow_up_questions": ["What is peak burst multiplier during month-end close?"],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"confidence": 0.96, "mode": "LIVE_AI"},
            },
            # Seeker 2 Opportunity
            {
                "id": "opp_rostova_firmware",
                "user_id": elena.id,
                "business_id": elena_biz.id,
                "title": "Portable Biomedical Telemetry Sensor Firmware & BLE Bridge",
                "submission_type": OpportunityType.PROBLEM.value,
                "intent": OpportunityIntent.SEEKING_SOLUTION.value,
                "category": OpportunityCategory.TECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=5),
                "original_description": "We are seeking a senior embedded firmware engineer to design ultra-low power FreeRTOS firmware and a Bluetooth Low Energy telemetry bridge.",
                "problem_statement": "Current sensor prototypes drain coin-cell battery life in 48 hours, failing the 30-day clinical monitoring requirement.",
                "proposed_solution": "Architect FreeRTOS tickless low-power sleep state engine with optimized BLE GATT streaming and onboard ring-buffer telemetry compression.",
                "industry": "Healthcare & MedTech",
                "value_proposition": "Achieve 45+ days continuous battery life on standard coin cell while preserving 100Hz real-time ECG/SpO2 telemetry resolution.",
                "target_customer_segments": ["Clinical Trial Networks", "Remote Patient Monitoring"],
                "customer_pain_points": ["Frequent battery replacements", "BLE connection dropouts"],
                "required_skills_and_resources": ["Embedded C", "FreeRTOS", "Nordic nRF52/53", "BLE GATT"],
                "potential_business_models": ["Milestone Commercial Contract"],
                "key_assumptions": ["Nordic Semiconductor SDK available"],
                "risks_and_uncertainties": ["Regulatory validation timeline"],
                "missing_information": [],
                "suggested_follow_up_questions": [],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"confidence": 0.94, "mode": "LIVE_AI"},
            },
            # Solver 1 Opportunity
            {
                "id": "opp_chen_streaming",
                "user_id": alex.id,
                "business_id": alex_biz.id,
                "title": "Distributed High-Concurrency API & Event Streaming Architecture",
                "submission_type": OpportunityType.IDEA.value,
                "intent": OpportunityIntent.OFFERING_SOLUTION.value,
                "category": OpportunityCategory.TECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=4),
                "original_description": "Production-hardened distributed backend architectures for high-throughput transactional and financial applications.",
                "problem_statement": "Startups and enterprises struggle to scale synchronous REST APIs beyond 10k requests/sec without complex rewrites.",
                "proposed_solution": "Turnkey asynchronous streaming microservice scaffold combining FastAPI, Kafka, and PostgreSQL with built-in idempotency.",
                "industry": "Cloud Infrastructure",
                "value_proposition": "Handle 100k+ events/sec with sub-50ms p99 latency while maintaining strict transactional guarantees.",
                "target_customer_segments": ["Fintech", "Logistics", "B2B SaaS"],
                "customer_pain_points": ["Database connection exhaustion", "System latency spikes"],
                "required_skills_and_resources": ["Python", "FastAPI", "Kafka", "PostgreSQL", "Docker"],
                "potential_business_models": ["Consulting & Delivery", "Architecture Retainer"],
                "key_assumptions": ["Cloud infrastructure on AWS or GCP"],
                "risks_and_uncertainties": [],
                "missing_information": [],
                "suggested_follow_up_questions": [],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"confidence": 0.95, "mode": "LIVE_AI"},
            },
            # Solver 2 Opportunity
            {
                "id": "opp_jenkins_embedded",
                "user_id": sarah.id,
                "business_id": sarah_biz.id,
                "title": "Ultra-Low Power IoT Sensor Firmware & Edge Telemetry",
                "submission_type": OpportunityType.IDEA.value,
                "intent": OpportunityIntent.OFFERING_SOLUTION.value,
                "category": OpportunityCategory.TECH.value,
                "status": OpportunityStatus.PUBLISHED.value,
                "visibility": OpportunityVisibility.PUBLIC.value,
                "published_at": now - timedelta(days=3),
                "original_description": "Full-lifecycle firmware engineering for wearable, clinical, and industrial IoT devices with extreme power constraints.",
                "problem_statement": "Most IoT devices fail in real-world deployments due to unoptimized peripheral polling and uncontrolled wireless wakeups.",
                "proposed_solution": "Custom FreeRTOS firmware with deterministic low-power modes, DMA-based sensor sampling, and robust BLE retry backoff.",
                "industry": "Embedded Systems",
                "value_proposition": "Extend operational battery lifespan by up to 500% with zero dropped sensor frames.",
                "target_customer_segments": ["Medical Device Creators", "Industrial Sensor Makers"],
                "customer_pain_points": ["Battery drain", "Unstable wireless connectivity"],
                "required_skills_and_resources": ["C", "C++", "FreeRTOS", "BLE", "ARM Cortex"],
                "potential_business_models": ["Deliverable Milestone Agreement"],
                "key_assumptions": [],
                "risks_and_uncertainties": [],
                "missing_information": [],
                "suggested_follow_up_questions": [],
                "provenance": {"problem_statement": ProvenanceCategory.USER_PROVIDED.value},
                "ai_metadata": {"confidence": 0.93, "mode": "LIVE_AI"},
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
        # 3. Collaboration 1: Marcus Vance (Seeker 1) <-> Alex Chen (Solver 1)
        # ---------------------------------------------------------------------
        conn1_id = "conn_vance_chen"
        conn1 = db.query(Connection).filter(Connection.id == conn1_id).first()
        if not conn1:
            conn1 = Connection(
                id=conn1_id,
                requester_id=alex.id,
                recipient_id=marcus.id,
                opportunity_id="opp_vance_pipeline",
                status=ConnectionStatus.ACCEPTED.value,
                intent=ConnectionIntent.OFFER_CAPABILITY.value,
                message="Hi Marcus! I saw your Autonomous Enterprise Data Ingestion requirement. I have architected high-concurrency streaming pipelines and would love to deliver the core service.",
                response_note="Hi Alex! Your distributed systems background is an exact fit for our throughput requirements. Let's agree on milestone terms.",
                accepted_at=now - timedelta(days=5),
            )
            db.add(conn1)
            print("  + Connection created: Vance <-> Chen (ACCEPTED)")
        else:
            conn1.status = ConnectionStatus.ACCEPTED.value
            conn1.accepted_at = now - timedelta(days=5)
        db.flush()

        prop1_id = "prop_vance_chen"
        agreed_milestones_1 = [
            {
                "title": "Architecture Blueprint & High-Throughput Ingestion Schema",
                "description": "Deliver modular FastAPI service architecture, PostgreSQL database schema with partitioning, and automated ingestion specifications.",
                "amount": "5000.00",
                "due_days": 14,
            },
            {
                "title": "Core Streaming Pipeline & Microservice Implementation",
                "description": "Implement async event processing, idempotency filters, and discrepancy flagging services.",
                "amount": "6000.00",
                "due_days": 21,
            },
            {
                "title": "End-to-End Stress Testing & Production Deployment",
                "description": "Deliver comprehensive integration test suite, load testing verification (>50k events/sec), and production deployment guide.",
                "amount": "4000.00",
                "due_days": 14,
            },
        ]

        prop1 = db.query(Proposal).filter(Proposal.id == prop1_id).first()
        if not prop1:
            prop1 = Proposal(
                id=prop1_id,
                connection_id=conn1.id,
                opportunity_id="opp_vance_pipeline",
                proposer_id=alex.id,
                recipient_id=marcus.id,
                status=ProposalStatus.ACCEPTED.value,
                current_version=1,
                title="Enterprise Data Ingestion & Streaming Pipeline",
                description="Commercial delivery agreement for autonomous data plane and streaming microservice.",
                scope_of_work="Architect, develop, and deploy an enterprise-grade streaming ingestion pipeline handling 50k+ events/sec with automated ledger synchronization.",
                deliverables=[
                    "FastAPI Modular Ingestion Service",
                    "PostgreSQL Schema & Automated Migration Scripts",
                    "Idempotency Protection & Discrepancy Detection Engine",
                    "Stress Testing Benchmarks (>50k events/sec verified)",
                    "Docker Compose & Kubernetes Deployment Runbook",
                ],
                budget_amount=Decimal("15000.00"),
                currency="USD",
                timeline_summary="7 weeks delivery across 3 distinct verification milestones",
                estimated_duration_days=49,
                milestones=agreed_milestones_1,
                responsibilities={
                    "proposer": "Lead distributed architecture, service development, and throughput benchmarking",
                    "recipient": "Provide sample ERP ledger feeds, review deliverable evidence, and authorize milestone payments",
                },
                assumptions=["Cloud environment runs on AWS EKS or GCP GKE"],
                conditions=["Milestone payments released upon evidence review approval"],
                notes="Weekly technical coordination on Tuesdays at 3 PM CT.",
                proposer_accepted_at=now - timedelta(days=4),
                recipient_accepted_at=now - timedelta(days=4),
                accepted_version=1,
            )
            db.add(prop1)
            print("  + Proposal created: prop_vance_chen (ACCEPTED, $15,000 USD)")
        else:
            prop1.status = ProposalStatus.ACCEPTED.value
            prop1.proposer_accepted_at = now - timedelta(days=4)
            prop1.recipient_accepted_at = now - timedelta(days=4)
        db.flush()

        # Proposal Revision 1
        rev1 = (
            db.query(ProposalRevision)
            .filter(ProposalRevision.proposal_id == prop1.id, ProposalRevision.version == 1)
            .first()
        )
        if not rev1:
            rev1 = ProposalRevision(
                proposal_id=prop1.id,
                version=1,
                created_by_id=alex.id,
                title=prop1.title,
                description=prop1.description,
                scope_of_work=prop1.scope_of_work,
                deliverables=prop1.deliverables,
                budget_amount=prop1.budget_amount,
                currency=prop1.currency,
                milestones=prop1.milestones,
                responsibilities=prop1.responsibilities,
                assumptions=prop1.assumptions,
                conditions=prop1.conditions,
                notes=prop1.notes,
                change_summary="Commercial terms mutually accepted by Marcus Vance and Alex Chen",
            )
            db.add(rev1)
            db.flush()

        # Deal Room 1
        room1_id = "room_vance_chen"
        room1 = db.query(DealRoom).filter(DealRoom.id == room1_id).first()
        if not room1:
            room1 = DealRoom(
                id=room1_id,
                proposal_id=prop1.id,
                connection_id=conn1.id,
                opportunity_id=prop1.opportunity_id,
                title=prop1.title,
                description=prop1.description,
                status=DealRoomStatus.ACTIVE.value,
                accepted_proposal_version=1,
                agreed_scope_of_work=prop1.scope_of_work,
                agreed_deliverables=prop1.deliverables,
                agreed_budget_amount=prop1.budget_amount,
                agreed_currency=prop1.currency,
                agreed_timeline_summary=prop1.timeline_summary,
                agreed_estimated_duration_days=prop1.estimated_duration_days,
                agreed_milestones=prop1.milestones,
                agreed_responsibilities=prop1.responsibilities,
                agreed_assumptions=prop1.assumptions,
                agreed_conditions=prop1.conditions,
                agreed_notes=prop1.notes,
            )
            db.add(room1)
            db.flush()
            print("  + Deal Room created: room_vance_chen (ACTIVE)")

            p1 = DealRoomParticipant(
                room_id=room1.id,
                user_id=marcus.id,
                collaboration_role="Client / Approver",
                assigned_responsibilities="Review deliverable evidence and execute milestone settlements",
            )
            p2 = DealRoomParticipant(
                room_id=room1.id,
                user_id=alex.id,
                collaboration_role="Lead Systems Architect",
                assigned_responsibilities="Lead architecture, implement pipeline services, and submit verification evidence",
            )
            db.add_all([p1, p2])

            act1 = DealRoomActivity(
                room_id=room1.id,
                actor_id=marcus.id,
                activity_type=DealRoomActivityType.ROOM_CREATED.value,
                title="Deal Room Created",
                details="Commercial collaboration workspace initialized from accepted proposal v1.",
            )
            db.add(act1)

            note1 = DealRoomNote(
                room_id=room1.id,
                author_id=alex.id,
                title="Architecture Blueprint & Ingestion Service Ready",
                content="Milestone 1 evidence has been uploaded with schema benchmarks and unit test coverage. Ready for payment settlement review.",
                is_pinned=True,
            )
            db.add(note1)

            doc1 = DealRoomDocument(
                room_id=room1.id,
                uploaded_by_id=alex.id,
                title="High-Throughput Ingestion Specification v1.0",
                document_type=DealRoomDocumentType.SPECIFICATION.value,
                reference_url="https://github.com/vance-systems/pipeline-specs",
                description="Architecture diagram and PostgreSQL partitioning strategy documentation.",
            )
            db.add(doc1)
            db.flush()

        # Deal Room 1 Milestones
        ms1_1 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room1.id, MilestoneExecution.milestone_index == 0)
            .first()
        )
        if not ms1_1:
            ms1_1 = MilestoneExecution(
                room_id=room1.id,
                source_proposal_id=prop1.id,
                accepted_proposal_version=1,
                milestone_index=0,
                title="Architecture Blueprint & High-Throughput Ingestion Schema",
                description="Deliver modular FastAPI service architecture, PostgreSQL database schema with partitioning, and automated ingestion specifications.",
                expected_deliverables=[
                    "FastAPI Core Ingestion Service",
                    "PostgreSQL Schema & Migration Scripts",
                ],
                agreed_amount=Decimal("5000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=alex.id,
                reviewer_user_id=marcus.id,
                status=MilestoneExecutionStatus.APPROVED.value,
                payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
                started_at=now - timedelta(days=4),
                submitted_at=now - timedelta(days=2),
                approved_at=now - timedelta(days=1),
            )
            db.add(ms1_1)
            db.flush()

            ev1_1 = MilestoneEvidence(
                milestone_id=ms1_1.id,
                room_id=room1.id,
                submitted_by_id=alex.id,
                submission_version=1,
                title="FastAPI Modular Ingestion Service & Partitioned Schema",
                description="Completed FastAPI core endpoints with 96% unit test coverage and PostgreSQL table partitioning schema.",
                evidence_type=MilestoneEvidenceType.CODE_REPOSITORY.value,
                reference_url="https://github.com/vance-systems/ingestion-service",
                attachments=[{"type": "link", "url": "https://github.com/vance-systems/ingestion-service/releases/tag/v1.0.0"}],
                status=EvidenceReviewStatus.APPROVED.value,
            )
            db.add(ev1_1)
            db.flush()

            rev1_1 = MilestoneReview(
                milestone_id=ms1_1.id,
                evidence_id=ev1_1.id,
                evidence_version=1,
                reviewer_id=marcus.id,
                decision=MilestoneReviewDecision.APPROVED.value,
                comments="Architecture verified, benchmark tests passing cleanly, and code quality approved. Authorized for settlement.",
            )
            db.add(rev1_1)
            print("  + Deal Room 1 Milestone 1 created (APPROVED, READY_FOR_PAYMENT_REVIEW)")

        # Prepare settlement transaction for Milestone 1
        tx1_1 = (
            db.query(Transaction)
            .filter(Transaction.milestone_id == ms1_1.id)
            .first()
        )
        if not tx1_1:
            tx1_1 = Transaction(
                transaction_ref="TXN-SETTLE-VANCE-001",
                business_id=marcus_biz.id,
                milestone_id=ms1_1.id,
                deal_room_id=room1.id,
                payer_user_id=marcus.id,
                payee_user_id=alex.id,
                amount=Decimal("5000.00"),
                currency="USD",
                status=TransactionStatus.PENDING,
                type=TransactionType.CUSTOMER_PAYMENT,
                payment_method="PAYPAL",
                description="Milestone 1 Settlement: Architecture Blueprint & High-Throughput Ingestion Schema",
                customer_name="Marcus Vance (Vance Enterprise Systems)",
                customer_email="seeker1@opnly.com",
            )
            db.add(tx1_1)
            print("  + Settlement transaction created: TXN-SETTLE-VANCE-001 (PENDING, $5,000.00)")

        ms1_2 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room1.id, MilestoneExecution.milestone_index == 1)
            .first()
        )
        if not ms1_2:
            ms1_2 = MilestoneExecution(
                room_id=room1.id,
                source_proposal_id=prop1.id,
                accepted_proposal_version=1,
                milestone_index=1,
                title="Core Streaming Pipeline & Microservice Implementation",
                description="Implement async event processing, idempotency filters, and discrepancy flagging services.",
                expected_deliverables=[
                    "Kafka Event Streaming Consumers",
                    "Idempotency Middleware",
                ],
                agreed_amount=Decimal("6000.00"),
                currency="USD",
                due_days=21,
                responsible_user_id=alex.id,
                reviewer_user_id=marcus.id,
                status=MilestoneExecutionStatus.IN_PROGRESS.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
                started_at=now - timedelta(days=1),
            )
            db.add(ms1_2)

        ms1_3 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room1.id, MilestoneExecution.milestone_index == 2)
            .first()
        )
        if not ms1_3:
            ms1_3 = MilestoneExecution(
                room_id=room1.id,
                source_proposal_id=prop1.id,
                accepted_proposal_version=1,
                milestone_index=2,
                title="End-to-End Stress Testing & Production Deployment",
                description="Deliver comprehensive integration test suite, load testing verification (>50k events/sec), and production deployment guide.",
                expected_deliverables=[
                    "Stress Testing Benchmarks (>50k events/sec)",
                    "Kubernetes Production Deployment Guide",
                ],
                agreed_amount=Decimal("4000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=alex.id,
                reviewer_user_id=marcus.id,
                status=MilestoneExecutionStatus.NOT_STARTED.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
            )
            db.add(ms1_3)
        db.flush()

        # ---------------------------------------------------------------------
        # 4. Collaboration 2: Elena Rostova (Seeker 2) <-> Sarah Jenkins (Solver 2)
        # ---------------------------------------------------------------------
        conn2_id = "conn_rostova_jenkins"
        conn2 = db.query(Connection).filter(Connection.id == conn2_id).first()
        if not conn2:
            conn2 = Connection(
                id=conn2_id,
                requester_id=sarah.id,
                recipient_id=elena.id,
                opportunity_id="opp_rostova_firmware",
                status=ConnectionStatus.ACCEPTED.value,
                intent=ConnectionIntent.OFFER_CAPABILITY.value,
                message="Hi Elena! I reviewed your Biomedical Sensor Telemetry requirement. I have extensive FreeRTOS and Nordic nRF52/53 BLE experience and can achieve your 30-day battery life target.",
                response_note="Hi Sarah! Your low-power Bluetooth and clinical sensor background is exactly what we need for our pilot trial. Let's formalize milestones.",
                accepted_at=now - timedelta(days=4),
            )
            db.add(conn2)
            print("  + Connection created: Rostova <-> Jenkins (ACCEPTED)")
        else:
            conn2.status = ConnectionStatus.ACCEPTED.value
            conn2.accepted_at = now - timedelta(days=4)
        db.flush()

        prop2_id = "prop_rostova_jenkins"
        agreed_milestones_2 = [
            {
                "title": "BLE Protocol Specification & Power Consumption Profiling",
                "description": "Deliver custom GATT service architecture, peripheral sleep cycle model, and power profiling benchmarks on Nordic nRF52.",
                "amount": "4000.00",
                "due_days": 14,
            },
            {
                "title": "FreeRTOS Kernel & Sensor Driver Implementation",
                "description": "Implement tickless idle FreeRTOS kernel, DMA-driven sensor sampling drivers, and onboard flash ring buffer.",
                "amount": "5000.00",
                "due_days": 21,
            },
            {
                "title": "Device Firmware Hardening & Clinical Telemetry Validation",
                "description": "Conduct 30-day battery run-down validation, automated BLE disconnect recovery, and clinical trial documentation.",
                "amount": "3000.00",
                "due_days": 14,
            },
        ]

        prop2 = db.query(Proposal).filter(Proposal.id == prop2_id).first()
        if not prop2:
            prop2 = Proposal(
                id=prop2_id,
                connection_id=conn2.id,
                opportunity_id="opp_rostova_firmware",
                proposer_id=sarah.id,
                recipient_id=elena.id,
                status=ProposalStatus.ACCEPTED.value,
                current_version=1,
                title="Biomedical Telemetry Firmware & Bluetooth Bridge",
                description="Engineering agreement for ultra-low power FreeRTOS wearable biometric firmware.",
                scope_of_work="Architect, develop, and validate medical-grade embedded firmware providing 45-day battery life and high-reliability BLE data streaming.",
                deliverables=[
                    "Custom Bluetooth Low Energy GATT Specification",
                    "FreeRTOS Low-Power Firmware with DMA Sensor Sampling",
                    "Flash Memory Telemetry Ring Buffer",
                    "Power Profiling Verification Report (Current < 25uA average sleep)",
                    "Manufacturing Flashing Firmware Binary & Source Code",
                ],
                budget_amount=Decimal("12000.00"),
                currency="USD",
                timeline_summary="7 weeks delivery in 3 execution milestones",
                estimated_duration_days=49,
                milestones=agreed_milestones_2,
                responsibilities={
                    "proposer": "Lead embedded firmware development, BLE protocol design, and power profiling",
                    "recipient": "Provide sensor hardware prototypes, review firmware validation, and approve milestone payouts",
                },
                assumptions=["Hardware prototype Nordic nRF52840 boards supplied"],
                conditions=["Firmware milestones approved following hardware bench testing"],
                notes="Bi-weekly lab progress syncs on Thursdays at 2 PM MT.",
                proposer_accepted_at=now - timedelta(days=3),
                recipient_accepted_at=now - timedelta(days=3),
                accepted_version=1,
            )
            db.add(prop2)
            print("  + Proposal created: prop_rostova_jenkins (ACCEPTED, $12,000 USD)")
        else:
            prop2.status = ProposalStatus.ACCEPTED.value
            prop2.proposer_accepted_at = now - timedelta(days=3)
            prop2.recipient_accepted_at = now - timedelta(days=3)
        db.flush()

        # Proposal Revision 2
        rev2 = (
            db.query(ProposalRevision)
            .filter(ProposalRevision.proposal_id == prop2.id, ProposalRevision.version == 1)
            .first()
        )
        if not rev2:
            rev2 = ProposalRevision(
                proposal_id=prop2.id,
                version=1,
                created_by_id=sarah.id,
                title=prop2.title,
                description=prop2.description,
                scope_of_work=prop2.scope_of_work,
                deliverables=prop2.deliverables,
                budget_amount=prop2.budget_amount,
                currency=prop2.currency,
                milestones=prop2.milestones,
                responsibilities=prop2.responsibilities,
                assumptions=prop2.assumptions,
                conditions=prop2.conditions,
                notes=prop2.notes,
                change_summary="Commercial terms mutually accepted by Elena Rostova and Sarah Jenkins",
            )
            db.add(rev2)
            db.flush()

        # Deal Room 2
        room2_id = "room_rostova_jenkins"
        room2 = db.query(DealRoom).filter(DealRoom.id == room2_id).first()
        if not room2:
            room2 = DealRoom(
                id=room2_id,
                proposal_id=prop2.id,
                connection_id=conn2.id,
                opportunity_id=prop2.opportunity_id,
                title=prop2.title,
                description=prop2.description,
                status=DealRoomStatus.ACTIVE.value,
                accepted_proposal_version=1,
                agreed_scope_of_work=prop2.scope_of_work,
                agreed_deliverables=prop2.deliverables,
                agreed_budget_amount=prop2.budget_amount,
                agreed_currency=prop2.currency,
                agreed_timeline_summary=prop2.timeline_summary,
                agreed_estimated_duration_days=prop2.estimated_duration_days,
                agreed_milestones=prop2.milestones,
                agreed_responsibilities=prop2.responsibilities,
                agreed_assumptions=prop2.assumptions,
                agreed_conditions=prop2.conditions,
                agreed_notes=prop2.notes,
            )
            db.add(room2)
            db.flush()
            print("  + Deal Room created: room_rostova_jenkins (ACTIVE)")

            p2_1 = DealRoomParticipant(
                room_id=room2.id,
                user_id=elena.id,
                collaboration_role="MedTech Founder / Client",
                assigned_responsibilities="Review firmware validation benchmarks and release milestone funds",
            )
            p2_2 = DealRoomParticipant(
                room_id=room2.id,
                user_id=sarah.id,
                collaboration_role="Senior Embedded Engineer",
                assigned_responsibilities="Design BLE architecture, implement FreeRTOS drivers, and submit validation test logs",
            )
            db.add_all([p2_1, p2_2])

            act2 = DealRoomActivity(
                room_id=room2.id,
                actor_id=elena.id,
                activity_type=DealRoomActivityType.ROOM_CREATED.value,
                title="Deal Room Created",
                details="Collaboration workspace established from accepted proposal v1.",
            )
            db.add(act2)

            note2 = DealRoomNote(
                room_id=room2.id,
                author_id=sarah.id,
                title="Milestone 1 Power Profiling Report",
                content="BLE GATT profile benchmarks show average sleep current of 18uA, well exceeding our target. Ready for milestone payment review.",
                is_pinned=True,
            )
            db.add(note2)

            doc2 = DealRoomDocument(
                room_id=room2.id,
                uploaded_by_id=sarah.id,
                title="GATT Service Specification & Power Budget v1.0",
                document_type=DealRoomDocumentType.SPECIFICATION.value,
                reference_url="https://github.com/rostova-biohealth/ble-specs",
                description="Nordic Semiconductor Power Profiler Kit II verification report and GATT schema.",
            )
            db.add(doc2)
            db.flush()

        # Deal Room 2 Milestones
        ms2_1 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room2.id, MilestoneExecution.milestone_index == 0)
            .first()
        )
        if not ms2_1:
            ms2_1 = MilestoneExecution(
                room_id=room2.id,
                source_proposal_id=prop2.id,
                accepted_proposal_version=1,
                milestone_index=0,
                title="BLE Protocol Specification & Power Consumption Profiling",
                description="Deliver custom GATT service architecture, peripheral sleep cycle model, and power profiling benchmarks on Nordic nRF52.",
                expected_deliverables=[
                    "Custom Bluetooth Low Energy GATT Specification",
                    "Power Profiling Verification Report",
                ],
                agreed_amount=Decimal("4000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=sarah.id,
                reviewer_user_id=elena.id,
                status=MilestoneExecutionStatus.APPROVED.value,
                payment_readiness=PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value,
                started_at=now - timedelta(days=3),
                submitted_at=now - timedelta(days=2),
                approved_at=now - timedelta(days=1),
            )
            db.add(ms2_1)
            db.flush()

            ev2_1 = MilestoneEvidence(
                milestone_id=ms2_1.id,
                room_id=room2.id,
                submitted_by_id=sarah.id,
                submission_version=1,
                title="BLE GATT Protocol Specification & Bench Test Report",
                description="Nordic Power Profiler log showing 18.4 uA quiescent sleep current, well below the 25 uA ceiling.",
                evidence_type=MilestoneEvidenceType.DOCUMENT.value,
                reference_url="https://github.com/rostova-biohealth/ble-specs/releases/tag/v1.0.0",
                attachments=[{"type": "link", "url": "https://github.com/rostova-biohealth/ble-specs/releases/tag/v1.0.0"}],
                status=EvidenceReviewStatus.APPROVED.value,
            )
            db.add(ev2_1)
            db.flush()

            rev2_1 = MilestoneReview(
                milestone_id=ms2_1.id,
                evidence_id=ev2_1.id,
                evidence_version=1,
                reviewer_id=elena.id,
                decision=MilestoneReviewDecision.APPROVED.value,
                comments="Power profiling confirmed in hardware lab. Exceeds clinical requirements. Approved for payment settlement.",
            )
            db.add(rev2_1)
            print("  + Deal Room 2 Milestone 1 created (APPROVED, READY_FOR_PAYMENT_REVIEW)")

        # Prepare settlement transaction for Milestone 1
        tx2_1 = (
            db.query(Transaction)
            .filter(Transaction.milestone_id == ms2_1.id)
            .first()
        )
        if not tx2_1:
            tx2_1 = Transaction(
                transaction_ref="TXN-SETTLE-ROSTOVA-001",
                business_id=elena_biz.id,
                milestone_id=ms2_1.id,
                deal_room_id=room2.id,
                payer_user_id=elena.id,
                payee_user_id=sarah.id,
                amount=Decimal("4000.00"),
                currency="USD",
                status=TransactionStatus.PENDING,
                type=TransactionType.CUSTOMER_PAYMENT,
                payment_method="PAYPAL",
                description="Milestone 1 Settlement: BLE Protocol Specification & Power Consumption Profiling",
                customer_name="Elena Rostova (Rostova BioHealth)",
                customer_email="seeker2@opnly.com",
            )
            db.add(tx2_1)
            print("  + Settlement transaction created: TXN-SETTLE-ROSTOVA-001 (PENDING, $4,000.00)")

        ms2_2 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room2.id, MilestoneExecution.milestone_index == 1)
            .first()
        )
        if not ms2_2:
            ms2_2 = MilestoneExecution(
                room_id=room2.id,
                source_proposal_id=prop2.id,
                accepted_proposal_version=1,
                milestone_index=1,
                title="FreeRTOS Kernel & Sensor Driver Implementation",
                description="Implement tickless idle FreeRTOS kernel, DMA-driven sensor sampling drivers, and onboard flash ring buffer.",
                expected_deliverables=[
                    "FreeRTOS Low-Power Firmware with DMA Sensor Sampling",
                    "Flash Memory Telemetry Ring Buffer",
                ],
                agreed_amount=Decimal("5000.00"),
                currency="USD",
                due_days=21,
                responsible_user_id=sarah.id,
                reviewer_user_id=elena.id,
                status=MilestoneExecutionStatus.IN_PROGRESS.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
                started_at=now - timedelta(days=1),
            )
            db.add(ms2_2)

        ms2_3 = (
            db.query(MilestoneExecution)
            .filter(MilestoneExecution.room_id == room2.id, MilestoneExecution.milestone_index == 2)
            .first()
        )
        if not ms2_3:
            ms2_3 = MilestoneExecution(
                room_id=room2.id,
                source_proposal_id=prop2.id,
                accepted_proposal_version=1,
                milestone_index=2,
                title="Device Firmware Hardening & Clinical Telemetry Validation",
                description="Conduct 30-day battery run-down validation, automated BLE disconnect recovery, and clinical trial documentation.",
                expected_deliverables=[
                    "30-Day Battery Run-down Validation Report",
                    "Manufacturing Flashing Firmware Binary & Source Code",
                ],
                agreed_amount=Decimal("3000.00"),
                currency="USD",
                due_days=14,
                responsible_user_id=sarah.id,
                reviewer_user_id=elena.id,
                status=MilestoneExecutionStatus.NOT_STARTED.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
            )
            db.add(ms2_3)
        db.flush()

        db.commit()
        print("\n[SUCCESS] Authentic 2 Seekers & 2 Solvers records and Deal Rooms are ready!")
        print("  Seeker 1: seeker1@opnly.com / Password123! (Marcus Vance)")
        print("  Seeker 2: seeker2@opnly.com / Password123! (Elena Rostova)")
        print("  Solver 1: solver1@opnly.com / Password123! (Alex Chen)")
        print("  Solver 2: solver2@opnly.com / Password123! (Sarah Jenkins)")


if __name__ == "__main__":
    seed_demo_data()
