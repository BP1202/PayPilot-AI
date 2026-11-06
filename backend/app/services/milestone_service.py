"""MilestoneService — business logic, state machine and evidence verification for Deal Room milestones."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.deal_room import (
    DealRoom,
    DealRoomActivity,
    DealRoomActivityType,
    DealRoomParticipant,
)
from app.models.milestone_execution import (
    EvidenceReviewStatus,
    MilestoneEvidence,
    MilestoneExecution,
    MilestoneExecutionStatus,
    MilestoneReview,
    MilestoneReviewDecision,
    PaymentReadinessStatus,
)
from app.models.user import User
from app.schemas.milestone_execution import (
    MilestoneAIAnalysisResponse,
    MilestoneCancelPayload,
    MilestoneEvidenceCreatePayload,
    MilestoneEvidenceResponse,
    MilestoneExecutionResponse,
    MilestoneListResponse,
    MilestoneParticipantSummary,
    MilestonePaymentReadinessResponse,
    MilestoneReviewPayload,
    MilestoneReviewResponse,
)

logger = logging.getLogger(__name__)


def _user_to_participant_summary(
    user: User, role: str | None = None
) -> MilestoneParticipantSummary:
    return MilestoneParticipantSummary(
        user_id=user.id,
        name=user.full_name,
        email=user.email,
        role=role,
    )


def _evidence_to_response(evi: MilestoneEvidence) -> MilestoneEvidenceResponse:
    submitter: User | None = evi.submitted_by
    return MilestoneEvidenceResponse(
        id=evi.id,
        milestone_id=evi.milestone_id,
        room_id=evi.room_id,
        submitted_by_id=evi.submitted_by_id,
        submitter_name=submitter.full_name if submitter else "Participant",
        submission_version=evi.submission_version,
        title=evi.title,
        description=evi.description,
        evidence_type=evi.evidence_type,
        reference_url=evi.reference_url,
        attachments=list(evi.attachments or []),
        status=EvidenceReviewStatus(evi.status),
        created_at=evi.created_at,
    )


def _review_to_response(rev: MilestoneReview) -> MilestoneReviewResponse:
    reviewer: User | None = rev.reviewer
    return MilestoneReviewResponse(
        id=rev.id,
        milestone_id=rev.milestone_id,
        evidence_id=rev.evidence_id,
        evidence_version=rev.evidence_version,
        reviewer_id=rev.reviewer_id,
        reviewer_name=reviewer.full_name if reviewer else "Reviewer",
        decision=MilestoneReviewDecision(rev.decision),
        comments=rev.comments,
        created_at=rev.created_at,
    )


def _milestone_to_response(
    milestone: MilestoneExecution,
    current_evidence: MilestoneEvidence | None = None,
) -> MilestoneExecutionResponse:
    # Pick current evidence submission if not passed
    evidence_res: MilestoneEvidenceResponse | None = None
    if current_evidence:
        evidence_res = _evidence_to_response(current_evidence)
    elif milestone.evidence_submissions:
        # Latest submission
        latest = milestone.evidence_submissions[-1]
        evidence_res = _evidence_to_response(latest)

    return MilestoneExecutionResponse(
        id=milestone.id,
        room_id=milestone.room_id,
        source_proposal_id=milestone.source_proposal_id,
        accepted_proposal_version=milestone.accepted_proposal_version,
        milestone_index=milestone.milestone_index,
        title=milestone.title,
        description=milestone.description,
        expected_deliverables=list(milestone.expected_deliverables or []),
        agreed_amount=(
            Decimal(str(milestone.agreed_amount))
            if milestone.agreed_amount is not None
            else None
        ),
        currency=milestone.currency or "USD",
        due_days=milestone.due_days,
        planned_due_date=milestone.planned_due_date,
        responsible_user=_user_to_participant_summary(
            milestone.responsible_user, "Responsible Worker"
        ),
        reviewer_user=_user_to_participant_summary(
            milestone.reviewer_user, "Designated Reviewer"
        ),
        status=MilestoneExecutionStatus(milestone.status),
        cancellation_reason=milestone.cancellation_reason,
        payment_readiness=PaymentReadinessStatus(milestone.payment_readiness),
        current_evidence_submission=evidence_res,
        evidence_submissions_count=len(milestone.evidence_submissions or []),
        reviews_count=len(milestone.reviews or []),
        started_at=milestone.started_at,
        submitted_at=milestone.submitted_at,
        approved_at=milestone.approved_at,
        created_at=milestone.created_at,
        updated_at=milestone.updated_at,
    )


class MilestoneService:
    """Service managing milestone lifecycle, evidence submissions, reviews and audit trail."""

    def _verify_room_participant(
        self, db: Session, user_id: str, room_id: str
    ) -> tuple[DealRoom, DealRoomParticipant]:
        room = (
            db.query(DealRoom)
            .options(
                joinedload(DealRoom.participants).joinedload(DealRoomParticipant.user),
                joinedload(DealRoom.proposal),
            )
            .filter(DealRoom.id == room_id)
            .first()
        )
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found",
            )
        for p in room.participants:
            if p.user_id == user_id:
                return room, p
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you are not an authorized participant in this Deal Room",
        )

    def _get_milestone_or_404(
        self, db: Session, room_id: str, milestone_id: str
    ) -> MilestoneExecution:
        milestone = (
            db.query(MilestoneExecution)
            .options(
                joinedload(MilestoneExecution.responsible_user),
                joinedload(MilestoneExecution.reviewer_user),
                joinedload(MilestoneExecution.evidence_submissions).joinedload(
                    MilestoneEvidence.submitted_by
                ),
                joinedload(MilestoneExecution.reviews).joinedload(
                    MilestoneReview.reviewer
                ),
            )
            .filter(
                MilestoneExecution.id == milestone_id,
                MilestoneExecution.room_id == room_id,
            )
            .first()
        )
        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone '{milestone_id}' not found in this Deal Room",
            )
        return milestone

    def initialize_milestones(
        self, db: Session, user_id: str, room_id: str
    ) -> list[MilestoneExecutionResponse]:
        """Idempotently initialize MilestoneExecution records from accepted proposal milestones."""
        room, _ = self._verify_room_participant(db, user_id, room_id)

        # 1. Idempotency check: if milestones already exist, return them
        existing = (
            db.query(MilestoneExecution)
            .options(
                joinedload(MilestoneExecution.responsible_user),
                joinedload(MilestoneExecution.reviewer_user),
                joinedload(MilestoneExecution.evidence_submissions),
                joinedload(MilestoneExecution.reviews),
            )
            .filter(MilestoneExecution.room_id == room.id)
            .order_by(MilestoneExecution.milestone_index.asc())
            .all()
        )
        if existing:
            return [_milestone_to_response(m) for m in existing]

        # 2. Check if agreed milestones exist
        agreed_list = room.agreed_milestones or []
        if not agreed_list:
            return []

        # 3. Determine responsible worker and reviewer participants
        # By convention in PayPilot collaborations:
        # - Proposer / Executing partner is responsible for deliverables
        # - Counterpart / Recipient is reviewer
        # If there are 2 participants, p1 and p2:
        participants = room.participants
        if len(participants) >= 2:
            responsible_id = participants[0].user_id
            reviewer_id = participants[1].user_id
        else:
            responsible_id = user_id
            reviewer_id = user_id

        # 4. Instantiate MilestoneExecution records
        created_milestones: list[MilestoneExecution] = []
        for idx, m_data in enumerate(agreed_list):
            amt = None
            raw_amt = m_data.get("amount")
            if raw_amt is not None:
                amt = Decimal(str(raw_amt))

            due_days = m_data.get("due_days")
            if due_days is not None:
                due_days = int(due_days)

            planned_date = None
            if due_days and room.created_at:
                planned_date = room.created_at + timedelta(days=due_days)

            delivs = m_data.get("deliverables")
            if not isinstance(delivs, list):
                delivs = (
                    [room.agreed_deliverables[idx]]
                    if idx < len(room.agreed_deliverables or [])
                    else []
                )

            m_obj = MilestoneExecution(
                room_id=room.id,
                source_proposal_id=room.proposal_id,
                accepted_proposal_version=room.accepted_proposal_version,
                milestone_index=idx,
                title=str(m_data.get("title") or f"Milestone {idx + 1}"),
                description=m_data.get("description"),
                expected_deliverables=delivs,
                agreed_amount=amt,
                currency=room.agreed_currency or "USD",
                due_days=due_days,
                planned_due_date=planned_date,
                responsible_user_id=responsible_id,
                reviewer_user_id=reviewer_id,
                status=MilestoneExecutionStatus.NOT_STARTED.value,
                payment_readiness=PaymentReadinessStatus.NOT_READY.value,
            )
            db.add(m_obj)
            created_milestones.append(m_obj)

        db.flush()

        # 5. Record activity
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.MILESTONE_INITIALIZED.value,
            title="Milestones initialized",
            details=f"Initialized {len(created_milestones)} milestone execution stages from Proposal v{room.accepted_proposal_version}.",
        )
        db.add(activity)
        db.commit()

        # Reload with relationships
        return self.list_milestones(db, user_id, room_id).items

    def list_milestones(
        self, db: Session, user_id: str, room_id: str
    ) -> MilestoneListResponse:
        """List all milestones in the Deal Room with summary aggregates."""
        room, _ = self._verify_room_participant(db, user_id, room_id)

        milestones = (
            db.query(MilestoneExecution)
            .options(
                joinedload(MilestoneExecution.responsible_user),
                joinedload(MilestoneExecution.reviewer_user),
                joinedload(MilestoneExecution.evidence_submissions).joinedload(
                    MilestoneEvidence.submitted_by
                ),
                joinedload(MilestoneExecution.reviews).joinedload(
                    MilestoneReview.reviewer
                ),
            )
            .filter(MilestoneExecution.room_id == room.id)
            .order_by(MilestoneExecution.milestone_index.asc())
            .all()
        )

        completed_count = 0
        in_progress_count = 0
        pending_review_count = 0
        total_agreed = Decimal("0.00")
        approved_amt = Decimal("0.00")

        items: list[MilestoneExecutionResponse] = []
        for m in milestones:
            if m.agreed_amount:
                total_agreed += Decimal(str(m.agreed_amount))
            if m.status == MilestoneExecutionStatus.APPROVED.value:
                completed_count += 1
                if m.agreed_amount:
                    approved_amt += Decimal(str(m.agreed_amount))
            elif m.status == MilestoneExecutionStatus.IN_PROGRESS.value:
                in_progress_count += 1
            elif m.status == MilestoneExecutionStatus.SUBMITTED_FOR_REVIEW.value:
                pending_review_count += 1

            items.append(_milestone_to_response(m))

        return MilestoneListResponse(
            items=items,
            total=len(items),
            completed_count=completed_count,
            in_progress_count=in_progress_count,
            pending_review_count=pending_review_count,
            total_agreed_amount=total_agreed,
            approved_amount=approved_amt,
        )

    def get_milestone(
        self, db: Session, user_id: str, room_id: str, milestone_id: str
    ) -> MilestoneExecutionResponse:
        """Fetch a single milestone execution record."""
        self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)
        return _milestone_to_response(m)

    def start_work(
        self, db: Session, user_id: str, room_id: str, milestone_id: str
    ) -> MilestoneExecutionResponse:
        """Responsible participant transitions milestone to IN_PROGRESS."""
        room, _ = self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        # Worker authorization
        if user_id != m.responsible_user_id and user_id != room.proposal.proposer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the responsible participant can start work on this milestone",
            )

        # State transition validation
        valid_start_states = {
            MilestoneExecutionStatus.NOT_STARTED.value,
            MilestoneExecutionStatus.REVISION_REQUESTED.value,
        }
        if m.status not in valid_start_states:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start work on milestone in status '{m.status}'",
            )

        m.status = MilestoneExecutionStatus.IN_PROGRESS.value
        m.started_at = m.started_at or datetime.now(UTC)
        m.updated_at = datetime.now(UTC)

        # Record activity
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.MILESTONE_STARTED.value,
            title="Milestone work started",
            details=f"Work initiated on '{m.title}' (Stage {m.milestone_index + 1}).",
        )
        db.add(activity)
        db.commit()

        return _milestone_to_response(
            self._get_milestone_or_404(db, room_id, milestone_id)
        )

    def submit_evidence(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        milestone_id: str,
        payload: MilestoneEvidenceCreatePayload,
    ) -> MilestoneEvidenceResponse:
        """Responsible participant submits deliverables & supporting evidence for review."""
        room, _ = self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        # Worker authorization
        if user_id != m.responsible_user_id and user_id != room.proposal.proposer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the responsible participant can submit deliverables for review",
            )

        # State validation: eligible states are IN_PROGRESS or REVISION_REQUESTED
        valid_submit_states = {
            MilestoneExecutionStatus.IN_PROGRESS.value,
            MilestoneExecutionStatus.REVISION_REQUESTED.value,
        }
        if m.status not in valid_submit_states:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit deliverables for milestone in status '{m.status}'",
            )

        # Monotonic versioning: calculate new version
        previous_count = (
            db.query(MilestoneEvidence)
            .filter(MilestoneEvidence.milestone_id == m.id)
            .count()
        )
        new_version = previous_count + 1

        # Supersede any previous pending reviews
        db.query(MilestoneEvidence).filter(
            MilestoneEvidence.milestone_id == m.id,
            MilestoneEvidence.status == EvidenceReviewStatus.PENDING_REVIEW.value,
        ).update({"status": EvidenceReviewStatus.SUPERSEDED.value})

        evidence = MilestoneEvidence(
            milestone_id=m.id,
            room_id=room.id,
            submitted_by_id=user_id,
            submission_version=new_version,
            title=payload.title.strip(),
            description=payload.description.strip(),
            evidence_type=payload.evidence_type.value,
            reference_url=payload.reference_url.strip(),
            attachments=payload.attachments or [],
            status=EvidenceReviewStatus.PENDING_REVIEW.value,
        )
        db.add(evidence)
        db.flush()

        # Advance milestone status to SUBMITTED_FOR_REVIEW
        m.current_evidence_submission_id = evidence.id
        m.status = MilestoneExecutionStatus.SUBMITTED_FOR_REVIEW.value
        m.submitted_at = datetime.now(UTC)
        m.updated_at = datetime.now(UTC)

        # Record activity
        act_type = (
            DealRoomActivityType.EVIDENCE_RESUBMITTED.value
            if new_version > 1
            else DealRoomActivityType.EVIDENCE_SUBMITTED.value
        )
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=act_type,
            title=f"Evidence {act_type.lower().replace('_', ' ')} (v{new_version})",
            details=f"Deliverable '{evidence.title}' submitted for '{m.title}'.",
        )
        db.add(activity)
        db.commit()

        loaded_evidence = (
            db.query(MilestoneEvidence)
            .options(joinedload(MilestoneEvidence.submitted_by))
            .filter(MilestoneEvidence.id == evidence.id)
            .first()
        )
        return _evidence_to_response(loaded_evidence or evidence)

    def review_milestone(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        milestone_id: str,
        payload: MilestoneReviewPayload,
    ) -> MilestoneExecutionResponse:
        """Authorized reviewer reviews submitted evidence: approves or requests revisions."""
        room, _ = self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        # 1. Dual-Party Security: Self-approval restriction
        if user_id == m.responsible_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Responsible participant cannot review or approve their own milestone deliverables",
            )

        # 2. Reviewer authorization: must be reviewer_user_id
        if user_id != m.reviewer_user_id and user_id != room.proposal.recipient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the authorized reviewer can review submitted deliverables",
            )

        # 3. State validation: must be SUBMITTED_FOR_REVIEW
        if m.status != MilestoneExecutionStatus.SUBMITTED_FOR_REVIEW.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Milestone is not pending review (current status: '{m.status}')",
            )

        # 4. Evidence validation
        evidence = (
            db.query(MilestoneEvidence)
            .filter(
                MilestoneEvidence.id == payload.evidence_id,
                MilestoneEvidence.milestone_id == m.id,
            )
            .first()
        )
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence submission '{payload.evidence_id}' not found for this milestone",
            )

        # 5. Apply decision
        if payload.decision == MilestoneReviewDecision.APPROVED:
            evidence.status = EvidenceReviewStatus.APPROVED.value
            m.status = MilestoneExecutionStatus.APPROVED.value
            m.approved_at = datetime.now(UTC)
            m.payment_readiness = PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value
            act_title = "Milestone deliverables approved"
            act_type = DealRoomActivityType.MILESTONE_APPROVED.value

        elif payload.decision == MilestoneReviewDecision.REVISION_REQUESTED:
            if not payload.comments or not payload.comments.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Feedback comments are required when requesting revisions",
                )
            evidence.status = EvidenceReviewStatus.REVISION_REQUESTED.value
            m.status = MilestoneExecutionStatus.REVISION_REQUESTED.value
            act_title = "Milestone revisions requested"
            act_type = DealRoomActivityType.REVISION_REQUESTED.value

        m.updated_at = datetime.now(UTC)

        # 6. Create immutable review record
        review_record = MilestoneReview(
            milestone_id=m.id,
            evidence_id=evidence.id,
            evidence_version=evidence.submission_version,
            reviewer_id=user_id,
            decision=payload.decision.value,
            comments=payload.comments.strip() if payload.comments else None,
        )
        db.add(review_record)

        # 7. Record activity
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=act_type,
            title=act_title,
            details=payload.comments
            or f"Milestone '{m.title}' reviewed: {payload.decision.value}.",
        )
        db.add(activity)
        db.commit()

        return _milestone_to_response(
            self._get_milestone_or_404(db, room_id, milestone_id)
        )

    def cancel_milestone(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        milestone_id: str,
        payload: MilestoneCancelPayload,
    ) -> MilestoneExecutionResponse:
        """Cancel an eligible non-approved milestone with mandatory justification."""
        room, _ = self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        if m.status == MilestoneExecutionStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel an already approved milestone",
            )

        m.status = MilestoneExecutionStatus.CANCELLED.value
        m.cancellation_reason = payload.reason.strip()
        m.updated_at = datetime.now(UTC)

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.MILESTONE_CANCELLED.value,
            title="Milestone cancelled",
            details=f"Milestone '{m.title}' cancelled: {m.cancellation_reason}",
        )
        db.add(activity)
        db.commit()

        return _milestone_to_response(
            self._get_milestone_or_404(db, room_id, milestone_id)
        )

    def get_payment_readiness(
        self, db: Session, user_id: str, room_id: str, milestone_id: str
    ) -> MilestonePaymentReadinessResponse:
        """Expose verified payment readiness summary for the future PayPal settlement module."""
        self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        approved_rev = (
            db.query(MilestoneReview)
            .filter(
                MilestoneReview.milestone_id == m.id,
                MilestoneReview.decision == MilestoneReviewDecision.APPROVED.value,
            )
            .order_by(MilestoneReview.created_at.desc())
            .first()
        )

        settlement_note = (
            "Verified human approval on record. Eligible for PayPal checkout review."
            if m.payment_readiness
            == PaymentReadinessStatus.READY_FOR_PAYMENT_REVIEW.value
            else "Deliverables not yet approved. Not eligible for payment."
        )

        return MilestonePaymentReadinessResponse(
            milestone_id=m.id,
            room_id=m.room_id,
            title=m.title,
            payment_readiness=PaymentReadinessStatus(m.payment_readiness),
            agreed_amount=(
                Decimal(str(m.agreed_amount)) if m.agreed_amount is not None else None
            ),
            currency=m.currency,
            approved_evidence_id=approved_rev.evidence_id if approved_rev else None,
            approved_evidence_version=(
                approved_rev.evidence_version if approved_rev else None
            ),
            reviewer_id=approved_rev.reviewer_id if approved_rev else None,
            approved_at=m.approved_at,
            source_proposal_version=m.accepted_proposal_version,
            settlement_note=settlement_note,
        )

    async def analyze_milestone_ai(
        self, db: Session, user_id: str, room_id: str, milestone_id: str
    ) -> MilestoneAIAnalysisResponse:
        """Grounded AI evaluation of deliverable completeness with transparent provenance."""
        self._verify_room_participant(db, user_id, room_id)
        m = self._get_milestone_or_404(db, room_id, milestone_id)

        # Deterministic deliverable checklist synthesis
        expected = m.expected_deliverables or []
        latest_evi = m.evidence_submissions[-1] if m.evidence_submissions else None

        deliv_analysis: list[dict[str, Any]] = []
        checklist: list[str] = []
        observations: list[str] = []

        agreed_terms_list: list[str] = [
            f"Milestone Title: {m.title}",
            (
                f"Agreed Budget: ${m.agreed_amount:,.2f} {m.currency}"
                if m.agreed_amount
                else "No budget"
            ),
            f"{len(expected)} expected deliverable items agreed in proposal v{m.accepted_proposal_version}",
        ]
        user_evidence_list: list[str] = []
        verified_records: list[str] = [
            f"Milestone state is {m.status}",
            f"Responsible: {m.responsible_user.full_name}",
            f"Reviewer: {m.reviewer_user.full_name}",
        ]
        ai_obs: list[str] = []
        ai_suggs: list[str] = []
        unknown_or_missing: list[str] = []

        if latest_evi:
            user_evidence_list.append(
                f"Submission v{latest_evi.submission_version}: '{latest_evi.title}'"
            )
            user_evidence_list.append(f"Reference: {latest_evi.reference_url}")
            desc_lower = latest_evi.description.lower()

            matches = 0
            for item in expected:
                found = any(
                    term in desc_lower for term in item.lower().split() if len(term) > 3
                )
                if found:
                    matches += 1
                    deliv_analysis.append({"deliverable": item, "status": "MENTIONED"})
                    ai_obs.append(
                        f"Found mention of '{item}' in submitted evidence description."
                    )
                else:
                    deliv_analysis.append(
                        {"deliverable": item, "status": "NOT_DETECTED"}
                    )
                    unknown_or_missing.append(
                        f"Deliverable '{item}' not explicitly mentioned in submission description."
                    )

            score = int(matches / len(expected) * 100) if expected else 85
            checklist.append(
                f"Verify reference URL links directly to submitted deliverables: {latest_evi.reference_url}"
            )
            checklist.append(
                "Confirm all acceptance criteria defined in proposal agreement are satisfied."
            )
            ai_suggs.append(
                "Reviewer should verify access permissions on external reference URL before approving."
            )
        else:
            score = 0
            observations.append("No deliverable evidence has been submitted yet.")
            unknown_or_missing.append(
                "Pending evidence submission from responsible participant."
            )
            ai_suggs.append(
                "Responsible worker should upload reference and click Submit for Review when ready."
            )

        provenance = {
            "AGREED_TERM": agreed_terms_list,
            "USER_SUBMITTED_EVIDENCE": user_evidence_list,
            "VERIFIED_APPLICATION_RECORD": verified_records,
            "AI_OBSERVATION": ai_obs or observations,
            "AI_SUGGESTION": ai_suggs,
            "AI_HYPOTHESIS": [],
            "UNKNOWN_OR_MISSING": unknown_or_missing,
        }

        # Attempt Gemini call if API key configured
        api_key = settings.AI_API_KEY.strip() if settings.AI_API_KEY else ""
        if api_key and latest_evi:
            try:
                system_prompt = (
                    "You are the PayPilot AI Milestone Review Assistant. "
                    "Analyze the agreed deliverables against the submitted evidence description. "
                    "Output valid JSON with keys: completeness_score (int 0-100), observations (list of str), "
                    "review_checklist (list of str). Do NOT approve or reject work."
                )
                user_msg = (
                    f"Agreed Deliverables: {json.dumps(expected)}\n"
                    f"Submitted Evidence: {latest_evi.title}\n"
                    f"Description: {latest_evi.description}\n"
                    f"Reference URL: {latest_evi.reference_url}"
                )
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                        json={
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": [{"parts": [{"text": user_msg}]}],
                            "generationConfig": {
                                "responseMimeType": "application/json"
                            },
                        },
                    )
                    if resp.status_code == 200:
                        parsed = resp.json()
                        raw_text = parsed["candidates"][0]["content"]["parts"][0][
                            "text"
                        ]
                        data = json.loads(raw_text)
                        return MilestoneAIAnalysisResponse(
                            milestone_id=m.id,
                            completeness_score=int(
                                data.get("completeness_score", score)
                            ),
                            deliverables_analysis=deliv_analysis,
                            review_checklist=data.get("review_checklist", checklist),
                            observations=data.get("observations", observations),
                            provenance_breakdown=provenance,
                            mode="LIVE_AI",
                            provider="google-gemini",
                            model="gemini-1.5-flash",
                        )
            except (
                httpx.HTTPError,
                json.JSONDecodeError,
                KeyError,
                ValueError,
            ) as e:
                logger.warning(
                    f"Gemini milestone analysis failed, falling back to deterministic: {e}"
                )

        return MilestoneAIAnalysisResponse(
            milestone_id=m.id,
            completeness_score=score,
            deliverables_analysis=deliv_analysis,
            review_checklist=checklist,
            observations=observations,
            provenance_breakdown=provenance,
            mode="DETERMINISTIC_FALLBACK",
            provider="deterministic-rule-engine",
            model="deterministic-rule-engine",
        )
