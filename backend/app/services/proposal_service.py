"""ProposalService — business logic for proposal lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.collaboration_activity import CollaborationActivity
from app.models.connection import Connection, ConnectionStatus
from app.models.profile import IndividualProfile
from app.models.proposal import Proposal, ProposalStatus
from app.models.proposal_revision import ProposalRevision
from app.models.user import User
from app.schemas.connection import ParticipantCard
from app.schemas.proposal import (
    ProposalActionPayload,
    ProposalCreatePayload,
    ProposalResponse,
    ProposalRevisionPayload,
    ProposalRevisionResponse,
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _build_participant_card(user: User) -> ParticipantCard:
    profile: IndividualProfile | None = getattr(user, "individual_profile", None)
    return ParticipantCard(
        user_id=user.id,
        full_name=user.full_name,
        headline=profile.headline if profile else None,
        industry=profile.industry if profile else None,
        skills=list(profile.skills) if profile else [],
    )


def _revision_to_response(rev: ProposalRevision) -> ProposalRevisionResponse:
    return ProposalRevisionResponse(
        id=rev.id,
        version=rev.version,
        title=rev.title,
        description=rev.description,
        scope_of_work=rev.scope_of_work,
        deliverables=list(rev.deliverables),
        budget_amount=(
            Decimal(str(rev.budget_amount)) if rev.budget_amount is not None else None
        ),
        currency=rev.currency,
        milestones=list(rev.milestones),
        responsibilities=dict(rev.responsibilities),
        assumptions=list(rev.assumptions),
        conditions=list(rev.conditions),
        notes=rev.notes,
        change_summary=rev.change_summary,
        created_by_id=rev.created_by_id,
        created_at=rev.created_at,
    )


def _proposal_to_response(proposal: Proposal) -> ProposalResponse:
    opp_title: str | None = None
    if proposal.opportunity is not None:
        opp_title = proposal.opportunity.title

    return ProposalResponse(
        id=proposal.id,
        connection_id=proposal.connection_id,
        opportunity_id=proposal.opportunity_id,
        opportunity_title=opp_title,
        proposer=_build_participant_card(proposal.proposer),
        recipient=_build_participant_card(proposal.recipient),
        status=ProposalStatus(proposal.status),
        current_version=proposal.current_version,
        title=proposal.title,
        description=proposal.description,
        scope_of_work=proposal.scope_of_work,
        deliverables=list(proposal.deliverables),
        budget_amount=(
            Decimal(str(proposal.budget_amount))
            if proposal.budget_amount is not None
            else None
        ),
        currency=proposal.currency,
        timeline_summary=proposal.timeline_summary,
        estimated_duration_days=proposal.estimated_duration_days,
        milestones=list(proposal.milestones),
        responsibilities=dict(proposal.responsibilities),
        assumptions=list(proposal.assumptions),
        conditions=list(proposal.conditions),
        notes=proposal.notes,
        proposer_accepted_at=proposal.proposer_accepted_at,
        recipient_accepted_at=proposal.recipient_accepted_at,
        accepted_version=proposal.accepted_version,
        rejection_reason=proposal.rejection_reason,
        revision_requested_note=proposal.revision_requested_note,
        revisions=[_revision_to_response(r) for r in proposal.revisions],
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
    )


def _load_proposal(db: Session, proposal_id: str) -> Proposal:
    proposal = (
        db.query(Proposal)
        .options(
            joinedload(Proposal.proposer).joinedload(User.individual_profile),
            joinedload(Proposal.recipient).joinedload(User.individual_profile),
            joinedload(Proposal.opportunity),
            joinedload(Proposal.revisions),
        )
        .filter(Proposal.id == proposal_id)
        .first()
    )
    if proposal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found.",
        )
    return proposal


def _snapshot_revision(
    db: Session,
    proposal: Proposal,
    created_by_id: str,
    change_summary: str | None,
) -> ProposalRevision:
    """Snapshot current proposal terms into a ProposalRevision record."""
    rev = ProposalRevision(
        proposal_id=proposal.id,
        version=proposal.current_version,
        created_by_id=created_by_id,
        title=proposal.title,
        description=proposal.description,
        scope_of_work=proposal.scope_of_work,
        deliverables=list(proposal.deliverables),
        budget_amount=proposal.budget_amount,
        currency=proposal.currency,
        milestones=list(proposal.milestones),
        responsibilities=dict(proposal.responsibilities),
        assumptions=list(proposal.assumptions),
        conditions=list(proposal.conditions),
        notes=proposal.notes,
        change_summary=change_summary,
    )
    db.add(rev)
    return rev


def _record_activity(
    db: Session,
    user_id: str,
    entity_type: str,
    entity_id: str,
    activity_type: str,
    title: str,
    details: str | None = None,
) -> None:
    act = CollaborationActivity(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        activity_type=activity_type,
        title=title,
        details=details,
    )
    db.add(act)


# ---------------------------------------------------------------------------
# ProposalService
# ---------------------------------------------------------------------------


class ProposalService:
    """Service responsible for proposal creation, revision, and state transitions."""

    def create_proposal(
        self,
        db: Session,
        user_id: str,
        payload: ProposalCreatePayload,
    ) -> ProposalResponse:
        """Create a new proposal on an ACCEPTED connection.

        Rules:
        - Connection must exist and be in ACCEPTED status.
        - user_id must be a participant of the connection.
        - budget_amount stored as Decimal / Numeric(12,2) — never float.
        """
        conn = (
            db.query(Connection).filter(Connection.id == payload.connection_id).first()
        )
        if conn is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found.",
            )

        if conn.status != ConnectionStatus.ACCEPTED.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A proposal can only be created on an ACCEPTED connection.",
            )

        if user_id not in (conn.requester_id, conn.recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant of this connection.",
            )

        # Determine proposer vs. recipient
        if user_id == conn.requester_id:
            recipient_id = conn.recipient_id
        else:
            recipient_id = conn.requester_id

        # Validate Decimal budget — guard against float contamination
        budget: Decimal | None = None
        if payload.budget_amount is not None:
            budget = Decimal(str(payload.budget_amount)).quantize(Decimal("0.01"))

        # Build milestones as plain JSON-serializable list
        milestones_data = [m.model_dump() for m in payload.milestones]
        # Convert Decimal amounts inside milestones for JSON storage
        for m in milestones_data:
            if isinstance(m.get("amount"), Decimal):
                m["amount"] = str(m["amount"])

        proposal = Proposal(
            connection_id=payload.connection_id,
            opportunity_id=payload.opportunity_id,
            proposer_id=user_id,
            recipient_id=recipient_id,
            status=ProposalStatus.SUBMITTED.value,
            current_version=1,
            title=payload.title,
            description=payload.description,
            scope_of_work=payload.scope_of_work,
            deliverables=payload.deliverables,
            budget_amount=budget,
            currency=payload.currency,
            timeline_summary=payload.timeline_summary,
            estimated_duration_days=payload.estimated_duration_days,
            milestones=milestones_data,
            responsibilities=dict(payload.responsibilities),
            assumptions=list(payload.assumptions),
            conditions=list(payload.conditions),
            notes=payload.notes,
        )
        db.add(proposal)
        db.flush()  # assign id

        # Snapshot version 1 revision
        _snapshot_revision(
            db,
            proposal=proposal,
            created_by_id=user_id,
            change_summary="Initial proposal submission",
        )

        # Notify recipient
        _record_activity(
            db,
            user_id=recipient_id,
            entity_type="PROPOSAL",
            entity_id=proposal.id,
            activity_type="PROPOSAL_RECEIVED",
            title="New proposal received",
            details=f"Title: {payload.title}",
        )

        db.commit()
        return _proposal_to_response(_load_proposal(db, proposal.id))

    def submit_revision(
        self,
        db: Session,
        user_id: str,
        proposal_id: str,
        payload: ProposalRevisionPayload,
    ) -> ProposalResponse:
        """Submit a revision to an existing proposal.

        Rules:
        - Only the proposer can submit a revision.
        - Proposal status must be REVISION_REQUESTED or DRAFT.
        - Snapshots current terms as a ProposalRevision, then increments version
          and applies new terms.
        - Resets acceptance timestamps and sets status to SUBMITTED.
        """
        proposal = _load_proposal(db, proposal_id)

        if proposal.proposer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the proposer can submit a revision.",
            )

        allowed_statuses = {
            ProposalStatus.REVISION_REQUESTED.value,
            ProposalStatus.DRAFT.value,
        }
        if proposal.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot submit a revision when proposal is in '{proposal.status}' status. "
                    "Expected REVISION_REQUESTED or DRAFT."
                ),
            )

        # Snapshot the CURRENT state before applying changes
        _snapshot_revision(
            db,
            proposal=proposal,
            created_by_id=user_id,
            change_summary=payload.change_summary,
        )

        # Increment version
        proposal.current_version += 1

        # Apply provided fields
        if payload.title is not None:
            proposal.title = payload.title
        if payload.description is not None:
            proposal.description = payload.description
        if payload.scope_of_work is not None:
            proposal.scope_of_work = payload.scope_of_work
        if payload.deliverables is not None:
            proposal.deliverables = list(payload.deliverables)
        if payload.budget_amount is not None:
            proposal.budget_amount = Decimal(str(payload.budget_amount)).quantize(
                Decimal("0.01")
            )
        if payload.currency is not None:
            proposal.currency = payload.currency
        if payload.timeline_summary is not None:
            proposal.timeline_summary = payload.timeline_summary
        if payload.estimated_duration_days is not None:
            proposal.estimated_duration_days = payload.estimated_duration_days
        if payload.milestones is not None:
            milestones_data = [m.model_dump() for m in payload.milestones]
            for m in milestones_data:
                if isinstance(m.get("amount"), Decimal):
                    m["amount"] = str(m["amount"])
            proposal.milestones = milestones_data
        if payload.responsibilities is not None:
            proposal.responsibilities = dict(payload.responsibilities)
        if payload.assumptions is not None:
            proposal.assumptions = list(payload.assumptions)
        if payload.conditions is not None:
            proposal.conditions = list(payload.conditions)
        if payload.notes is not None:
            proposal.notes = payload.notes

        # Reset acceptance state
        proposal.proposer_accepted_at = None
        proposal.recipient_accepted_at = None
        proposal.revision_requested_note = None
        proposal.status = ProposalStatus.SUBMITTED.value
        proposal.updated_at = datetime.now(UTC)

        # Notify recipient
        _record_activity(
            db,
            user_id=proposal.recipient_id,
            entity_type="PROPOSAL",
            entity_id=proposal.id,
            activity_type="PROPOSAL_REVISED",
            title="Proposal revised",
            details=payload.change_summary,
        )

        db.commit()
        return _proposal_to_response(_load_proposal(db, proposal.id))

    def respond_to_proposal(
        self,
        db: Session,
        user_id: str,
        proposal_id: str,
        payload: ProposalActionPayload,
    ) -> ProposalResponse:
        """Accept, reject, request revision, or withdraw a proposal.

        State transition rules:
        - ACCEPT: recipient only; status must be SUBMITTED, UNDER_REVIEW, or REVISION_REQUESTED.
        - REJECT: recipient only; status must be SUBMITTED or UNDER_REVIEW.
        - REQUEST_REVISION: recipient only; status must be SUBMITTED or UNDER_REVIEW.
        - WITHDRAW: proposer only; status must NOT be ACCEPTED.
        """
        proposal = _load_proposal(db, proposal_id)
        now = datetime.now(UTC)
        action = payload.action

        if action == "WITHDRAW":
            if proposal.proposer_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the proposer can withdraw this proposal.",
                )
            if proposal.status == ProposalStatus.ACCEPTED.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot withdraw an already ACCEPTED proposal.",
                )
            proposal.status = ProposalStatus.WITHDRAWN.value
            proposal.updated_at = now
            other_user_id = proposal.recipient_id
            _record_activity(
                db,
                user_id=other_user_id,
                entity_type="PROPOSAL",
                entity_id=proposal.id,
                activity_type="PROPOSAL_WITHDRAWN",
                title="Proposal withdrawn by proposer",
            )

        elif action in ("ACCEPT", "REJECT", "REQUEST_REVISION"):
            if proposal.recipient_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the recipient can perform this action on the proposal.",
                )

            if action == "ACCEPT":
                allowed = {
                    ProposalStatus.SUBMITTED.value,
                    ProposalStatus.UNDER_REVIEW.value,
                    ProposalStatus.REVISION_REQUESTED.value,
                }
                if proposal.status not in allowed:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Cannot ACCEPT a proposal in '{proposal.status}' status."
                        ),
                    )
                proposal.recipient_accepted_at = now
                proposal.accepted_version = proposal.current_version
                proposal.status = ProposalStatus.ACCEPTED.value
                proposal.updated_at = now
                _record_activity(
                    db,
                    user_id=proposal.proposer_id,
                    entity_type="PROPOSAL",
                    entity_id=proposal.id,
                    activity_type="PROPOSAL_ACCEPTED",
                    title="Proposal accepted",
                )

            elif action == "REJECT":
                allowed = {
                    ProposalStatus.SUBMITTED.value,
                    ProposalStatus.UNDER_REVIEW.value,
                }
                if proposal.status not in allowed:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Cannot REJECT a proposal in '{proposal.status}' status."
                        ),
                    )
                proposal.status = ProposalStatus.REJECTED.value
                proposal.rejection_reason = payload.note
                proposal.updated_at = now
                _record_activity(
                    db,
                    user_id=proposal.proposer_id,
                    entity_type="PROPOSAL",
                    entity_id=proposal.id,
                    activity_type="PROPOSAL_REJECTED",
                    title="Proposal rejected",
                    details=payload.note,
                )

            elif action == "REQUEST_REVISION":
                allowed = {
                    ProposalStatus.SUBMITTED.value,
                    ProposalStatus.UNDER_REVIEW.value,
                }
                if proposal.status not in allowed:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Cannot REQUEST_REVISION on a proposal in '{proposal.status}' status."
                        ),
                    )
                proposal.status = ProposalStatus.REVISION_REQUESTED.value
                proposal.revision_requested_note = payload.note
                proposal.updated_at = now
                _record_activity(
                    db,
                    user_id=proposal.proposer_id,
                    entity_type="PROPOSAL",
                    entity_id=proposal.id,
                    activity_type="PROPOSAL_REVISION_REQUESTED",
                    title="Revision requested on proposal",
                    details=payload.note,
                )

        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown proposal action: {action}",
            )

        db.commit()
        return _proposal_to_response(_load_proposal(db, proposal.id))

    def get_proposal(
        self,
        db: Session,
        user_id: str,
        proposal_id: str,
    ) -> ProposalResponse:
        """Get a proposal's full details including revision history.

        Only proposer or recipient may access.
        """
        proposal = _load_proposal(db, proposal_id)

        if user_id not in (proposal.proposer_id, proposal.recipient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant of this proposal.",
            )

        return _proposal_to_response(proposal)

    def list_proposals(
        self,
        db: Session,
        user_id: str,
        role: str = "all",
    ) -> list[ProposalResponse]:
        """List proposals the user is involved in.

        role: "sent" | "received" | "all"
        """
        q = db.query(Proposal).options(
            joinedload(Proposal.proposer).joinedload(User.individual_profile),
            joinedload(Proposal.recipient).joinedload(User.individual_profile),
            joinedload(Proposal.opportunity),
            joinedload(Proposal.revisions),
        )

        if role == "sent":
            q = q.filter(Proposal.proposer_id == user_id)
        elif role == "received":
            q = q.filter(Proposal.recipient_id == user_id)
        else:
            from sqlalchemy import or_

            q = q.filter(
                or_(
                    Proposal.proposer_id == user_id,
                    Proposal.recipient_id == user_id,
                )
            )

        proposals = q.order_by(Proposal.created_at.desc()).all()
        return [_proposal_to_response(p) for p in proposals]
