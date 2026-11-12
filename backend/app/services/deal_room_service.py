"""DealRoomService — business logic and security policies for Deal Rooms."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.deal_room import (
    DealRoom,
    DealRoomActivity,
    DealRoomActivityType,
    DealRoomClarification,
    DealRoomClarificationStatus,
    DealRoomDocument,
    DealRoomNote,
    DealRoomParticipant,
    DealRoomStatus,
)
from app.models.profile import IndividualProfile
from app.models.proposal import Proposal, ProposalStatus
from app.models.user import User
from app.schemas.deal_room import (
    DealRoomActivityResponse,
    DealRoomAIAnalysisResponse,
    DealRoomClarificationAnswerPayload,
    DealRoomClarificationCreatePayload,
    DealRoomClarificationResponse,
    DealRoomCreatePayload,
    DealRoomDocumentCreatePayload,
    DealRoomDocumentResponse,
    DealRoomNoteCreatePayload,
    DealRoomNoteResponse,
    DealRoomOverviewResponse,
    DealRoomParticipantCard,
    DealRoomResponse,
    DealRoomStatusUpdatePayload,
)
from app.services.deal_room_copilot import GeminiDealRoomCopilot


def _participant_to_card(participant: DealRoomParticipant) -> DealRoomParticipantCard:
    user: User = participant.user
    profile: IndividualProfile | None = (
        getattr(user, "individual_profile", None) if user else None
    )
    return DealRoomParticipantCard(
        id=participant.id,
        user_id=participant.user_id,
        name=user.full_name if user else "Participant",
        headline=profile.headline if profile else None,
        industry=profile.industry if profile else None,
        collaboration_role=participant.collaboration_role,
        assigned_responsibilities=participant.assigned_responsibilities,
        joined_at=participant.joined_at,
    )


def _activity_to_response(activity: DealRoomActivity) -> DealRoomActivityResponse:
    actor: User | None = activity.actor
    return DealRoomActivityResponse(
        id=activity.id,
        room_id=activity.room_id,
        actor_id=activity.actor_id,
        actor_name=actor.full_name if actor else "System",
        activity_type=DealRoomActivityType(activity.activity_type),
        title=activity.title,
        details=activity.details,
        created_at=activity.created_at,
    )


def _note_to_response(note: DealRoomNote) -> DealRoomNoteResponse:
    author: User | None = note.author
    return DealRoomNoteResponse(
        id=note.id,
        room_id=note.room_id,
        author_id=note.author_id,
        author_name=author.full_name if author else "Participant",
        title=note.title,
        content=note.content,
        is_pinned=note.is_pinned,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def _clarification_to_response(
    clarification: DealRoomClarification,
) -> DealRoomClarificationResponse:
    asked_by: User | None = clarification.asked_by
    answered_by: User | None = clarification.answered_by
    return DealRoomClarificationResponse(
        id=clarification.id,
        room_id=clarification.room_id,
        asked_by_id=clarification.asked_by_id,
        asker_name=asked_by.full_name if asked_by else "Participant",
        question=clarification.question,
        status=DealRoomClarificationStatus(clarification.status),
        answered_by_id=clarification.answered_by_id,
        answerer_name=answered_by.full_name if answered_by else None,
        answer=clarification.answer,
        answered_at=clarification.answered_at,
        created_at=clarification.created_at,
    )


def _document_to_response(doc: DealRoomDocument) -> DealRoomDocumentResponse:
    uploader: User | None = doc.uploaded_by
    return DealRoomDocumentResponse(
        id=doc.id,
        room_id=doc.room_id,
        uploaded_by_id=doc.uploaded_by_id,
        uploader_name=uploader.full_name if uploader else "Participant",
        title=doc.title,
        document_type=doc.document_type,
        reference_url=doc.reference_url,
        description=doc.description,
        created_at=doc.created_at,
    )


def _deal_room_to_response(room: DealRoom) -> DealRoomResponse:
    opportunity_title: str | None = None
    if room.opportunity is not None:
        opportunity_title = room.opportunity.title
    elif room.proposal is not None and room.proposal.opportunity is not None:
        opportunity_title = room.proposal.opportunity.title

    return DealRoomResponse(
        id=room.id,
        proposal_id=room.proposal_id,
        connection_id=room.connection_id,
        opportunity_id=room.opportunity_id,
        opportunity_title=opportunity_title,
        title=room.title,
        description=room.description,
        status=DealRoomStatus(room.status),
        status_reason=room.status_reason,
        accepted_proposal_version=room.accepted_proposal_version,
        agreed_scope_of_work=room.agreed_scope_of_work,
        agreed_deliverables=list(room.agreed_deliverables or []),
        agreed_budget_amount=(
            Decimal(str(room.agreed_budget_amount))
            if room.agreed_budget_amount is not None
            else None
        ),
        agreed_currency=room.agreed_currency or "USD",
        agreed_timeline_summary=room.agreed_timeline_summary,
        agreed_estimated_duration_days=room.agreed_estimated_duration_days,
        agreed_milestones=list(room.agreed_milestones or []),
        agreed_responsibilities=dict(room.agreed_responsibilities or {}),
        agreed_assumptions=list(room.agreed_assumptions or []),
        agreed_conditions=list(room.agreed_conditions or []),
        agreed_notes=room.agreed_notes,
        participants=[_participant_to_card(p) for p in room.participants],
        created_at=room.created_at,
        updated_at=room.updated_at,
    )


class DealRoomService:
    """Service layer managing Deal Room workspace lifecycle and collaboration."""

    def _get_room_or_404(self, db: Session, room_id: str) -> DealRoom:
        room = (
            db.query(DealRoom)
            .options(
                joinedload(DealRoom.participants).joinedload(DealRoomParticipant.user),
                joinedload(DealRoom.opportunity),
                joinedload(DealRoom.proposal).joinedload(Proposal.opportunity),
            )
            .filter(
                or_(
                    DealRoom.id == room_id,
                    DealRoom.proposal_id == room_id,
                )
            )
            .first()
        )
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deal Room '{room_id}' not found",
            )
        return room

    def _verify_participant(self, room: DealRoom, user_id: str) -> DealRoomParticipant:
        for p in room.participants:
            if p.user_id == user_id:
                return p
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you are not an authorized participant in this Deal Room",
        )

    def create_deal_room(
        self,
        db: Session,
        user_id: str,
        payload: DealRoomCreatePayload,
    ) -> DealRoomResponse:
        """Create or return an existing Deal Room for a mutually accepted proposal."""
        # 1. Fetch proposal
        proposal = (
            db.query(Proposal)
            .options(
                joinedload(Proposal.proposer),
                joinedload(Proposal.recipient),
                joinedload(Proposal.opportunity),
            )
            .filter(Proposal.id == payload.proposal_id)
            .first()
        )
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced proposal does not exist",
            )

        # 2. Verify status
        if proposal.status != ProposalStatus.ACCEPTED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deal Room can only be created from a mutually accepted proposal",
            )

        # 3. Verify user authorization (must be proposer or recipient)
        if user_id != proposal.proposer_id and user_id != proposal.recipient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only participants of this accepted proposal can open its Deal Room",
            )

        # 4. Idempotent check: if a Deal Room already exists, return it
        existing_room = (
            db.query(DealRoom)
            .options(
                joinedload(DealRoom.participants).joinedload(DealRoomParticipant.user),
                joinedload(DealRoom.opportunity),
                joinedload(DealRoom.proposal).joinedload(Proposal.opportunity),
            )
            .filter(DealRoom.proposal_id == proposal.id)
            .first()
        )
        if existing_room:
            return _deal_room_to_response(existing_room)

        # 5. Extract responsibilities from proposal
        proposer_resp: str | None = None
        recipient_resp: str | None = None
        if isinstance(proposal.responsibilities, dict):
            proposer_val = proposal.responsibilities.get("proposer")
            recipient_val = proposal.responsibilities.get("recipient")
            if proposer_val:
                proposer_resp = (
                    str(proposer_val)
                    if not isinstance(proposer_val, list)
                    else "; ".join(str(x) for x in proposer_val)
                )
            if recipient_val:
                recipient_resp = (
                    str(recipient_val)
                    if not isinstance(recipient_val, list)
                    else "; ".join(str(x) for x in recipient_val)
                )

        # 6. Instantiate Deal Room snapshot
        room = DealRoom(
            proposal_id=proposal.id,
            connection_id=proposal.connection_id,
            opportunity_id=proposal.opportunity_id,
            title=proposal.title,
            description=proposal.description,
            status=DealRoomStatus.ACTIVE.value,
            accepted_proposal_version=proposal.accepted_version
            or proposal.current_version,
            agreed_scope_of_work=proposal.scope_of_work,
            agreed_deliverables=list(proposal.deliverables or []),
            agreed_budget_amount=proposal.budget_amount,
            agreed_currency=proposal.currency or "USD",
            agreed_timeline_summary=proposal.timeline_summary,
            agreed_estimated_duration_days=proposal.estimated_duration_days,
            agreed_milestones=list(proposal.milestones or []),
            agreed_responsibilities=dict(proposal.responsibilities or {}),
            agreed_assumptions=list(proposal.assumptions or []),
            agreed_conditions=list(proposal.conditions or []),
            agreed_notes=proposal.notes,
        )
        db.add(room)
        db.flush()

        # 7. Add participants
        p1 = DealRoomParticipant(
            room_id=room.id,
            user_id=proposal.proposer_id,
            collaboration_role="Proposer / Initiator",
            assigned_responsibilities=proposer_resp,
        )
        p2 = DealRoomParticipant(
            room_id=room.id,
            user_id=proposal.recipient_id,
            collaboration_role="Counterpart / Collaborator",
            assigned_responsibilities=recipient_resp,
        )
        db.add_all([p1, p2])

        # 8. Record initialization activity
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.ROOM_CREATED.value,
            title="Deal Room opened",
            details=f"Collaboration workspace initialized from accepted proposal v{room.accepted_proposal_version}.",
        )
        db.add(activity)

        db.commit()

        # Reload with relationships
        return _deal_room_to_response(self._get_room_or_404(db, room.id))

    def get_deal_room(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> DealRoomResponse:
        """Fetch a Deal Room by ID, enforcing participant authorization."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)
        return _deal_room_to_response(room)

    def list_user_deal_rooms(
        self,
        db: Session,
        user_id: str,
        status_filter: DealRoomStatus | None = None,
    ) -> list[DealRoomResponse]:
        """List all Deal Rooms the user participates in."""
        query = (
            db.query(DealRoom)
            .join(DealRoomParticipant, DealRoomParticipant.room_id == DealRoom.id)
            .options(
                joinedload(DealRoom.participants).joinedload(DealRoomParticipant.user),
                joinedload(DealRoom.opportunity),
                joinedload(DealRoom.proposal).joinedload(Proposal.opportunity),
            )
            .filter(DealRoomParticipant.user_id == user_id)
        )
        if status_filter:
            query = query.filter(DealRoom.status == status_filter.value)

        rooms = query.order_by(DealRoom.updated_at.desc()).all()
        return [_deal_room_to_response(r) for r in rooms]

    def get_deal_room_overview(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> DealRoomOverviewResponse:
        """Return executive summary metrics and recent activity for the workspace."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        # Count metrics
        deliverables_count = len(room.agreed_deliverables or [])
        milestones_count = len(room.agreed_milestones or [])

        open_clarifications_count = (
            db.query(DealRoomClarification)
            .filter(
                DealRoomClarification.room_id == room.id,
                DealRoomClarification.status == DealRoomClarificationStatus.OPEN.value,
            )
            .count()
        )

        pinned_notes_count = (
            db.query(DealRoomNote)
            .filter(
                DealRoomNote.room_id == room.id,
                DealRoomNote.is_pinned.is_(True),
            )
            .count()
        )

        documents_count = (
            db.query(DealRoomDocument)
            .filter(DealRoomDocument.room_id == room.id)
            .count()
        )

        recent_activities_models = (
            db.query(DealRoomActivity)
            .options(joinedload(DealRoomActivity.actor))
            .filter(DealRoomActivity.room_id == room.id)
            .order_by(DealRoomActivity.created_at.desc())
            .limit(10)
            .all()
        )

        opportunity_title: str | None = None
        if room.opportunity:
            opportunity_title = room.opportunity.title
        elif room.proposal and room.proposal.opportunity:
            opportunity_title = room.proposal.opportunity.title

        return DealRoomOverviewResponse(
            id=room.id,
            title=room.title,
            status=DealRoomStatus(room.status),
            status_reason=room.status_reason,
            accepted_proposal_version=room.accepted_proposal_version,
            opportunity_title=opportunity_title,
            participants=[_participant_to_card(p) for p in room.participants],
            scope_preview=(
                room.agreed_scope_of_work[:200] + "..."
                if room.agreed_scope_of_work and len(room.agreed_scope_of_work) > 200
                else room.agreed_scope_of_work
            ),
            deliverables_count=deliverables_count,
            milestones_count=milestones_count,
            total_budget=(
                Decimal(str(room.agreed_budget_amount))
                if room.agreed_budget_amount is not None
                else None
            ),
            currency=room.agreed_currency or "USD",
            estimated_duration_days=room.agreed_estimated_duration_days,
            recent_activities=[
                _activity_to_response(a) for a in recent_activities_models
            ],
            open_clarifications_count=open_clarifications_count,
            pinned_notes_count=pinned_notes_count,
            documents_count=documents_count,
        )

    def update_status(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        payload: DealRoomStatusUpdatePayload,
    ) -> DealRoomResponse:
        """Execute state transition with lifecycle rules and audit trail."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        current_status = DealRoomStatus(room.status)
        target_status = payload.status

        # Valid transitions mapping
        valid_transitions = {
            DealRoomStatus.ACTIVE: {
                DealRoomStatus.ON_HOLD,
                DealRoomStatus.COMPLETION_REVIEW,
                DealRoomStatus.CANCELLED,
            },
            DealRoomStatus.ON_HOLD: {
                DealRoomStatus.ACTIVE,
                DealRoomStatus.CANCELLED,
            },
            DealRoomStatus.COMPLETION_REVIEW: {
                DealRoomStatus.COMPLETED,
                DealRoomStatus.ACTIVE,
            },
            DealRoomStatus.COMPLETED: set(),
            DealRoomStatus.CANCELLED: set(),
        }

        if target_status not in valid_transitions.get(current_status, set()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid state transition: cannot transition from {current_status.value} to {target_status.value}",
            )

        # Require reason for ON_HOLD and CANCELLED
        if target_status in (
            DealRoomStatus.ON_HOLD,
            DealRoomStatus.CANCELLED,
        ) and (not payload.reason or not payload.reason.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A justification reason is required when transitioning to {target_status.value}",
            )

        room.status = target_status.value
        room.status_reason = payload.reason.strip() if payload.reason else None
        room.updated_at = datetime.now(UTC)

        # Record activity
        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.STATUS_CHANGED.value,
            title=f"Status transitioned to {target_status.value}",
            details=payload.reason
            or f"Deal Room status changed from {current_status.value} to {target_status.value}.",
        )
        db.add(activity)
        db.commit()

        return _deal_room_to_response(self._get_room_or_404(db, room.id))

    def add_note(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        payload: DealRoomNoteCreatePayload,
    ) -> DealRoomNoteResponse:
        """Add a shared note to the workspace."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        note = DealRoomNote(
            room_id=room.id,
            author_id=user_id,
            title=payload.title.strip(),
            content=payload.content.strip(),
            is_pinned=payload.is_pinned,
        )
        db.add(note)
        db.flush()

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.NOTE_ADDED.value,
            title="Shared note added",
            details=f"Note created: '{note.title}'.",
        )
        db.add(activity)
        db.commit()

        note_loaded = (
            db.query(DealRoomNote)
            .options(joinedload(DealRoomNote.author))
            .filter(DealRoomNote.id == note.id)
            .first()
        )
        return _note_to_response(note_loaded or note)

    def list_notes(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> list[DealRoomNoteResponse]:
        """List all notes in the workspace, pinned first then chronological."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        notes = (
            db.query(DealRoomNote)
            .options(joinedload(DealRoomNote.author))
            .filter(DealRoomNote.room_id == room.id)
            .order_by(DealRoomNote.is_pinned.desc(), DealRoomNote.created_at.desc())
            .all()
        )
        return [_note_to_response(n) for n in notes]

    def ask_clarification(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        payload: DealRoomClarificationCreatePayload,
    ) -> DealRoomClarificationResponse:
        """Submit a question or clarification request."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        clarification = DealRoomClarification(
            room_id=room.id,
            asked_by_id=user_id,
            question=payload.question.strip(),
            status=DealRoomClarificationStatus.OPEN.value,
        )
        db.add(clarification)
        db.flush()

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.CLARIFICATION_OPENED.value,
            title="Clarification opened",
            details=f"Question submitted: {clarification.question[:100]}...",
        )
        db.add(activity)
        db.commit()

        loaded = (
            db.query(DealRoomClarification)
            .options(
                joinedload(DealRoomClarification.asked_by),
                joinedload(DealRoomClarification.answered_by),
            )
            .filter(DealRoomClarification.id == clarification.id)
            .first()
        )
        return _clarification_to_response(loaded or clarification)

    def answer_clarification(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        clarification_id: str,
        payload: DealRoomClarificationAnswerPayload,
    ) -> DealRoomClarificationResponse:
        """Answer an open clarification question."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        clarification = (
            db.query(DealRoomClarification)
            .filter(
                DealRoomClarification.id == clarification_id,
                DealRoomClarification.room_id == room.id,
            )
            .first()
        )
        if not clarification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Clarification '{clarification_id}' not found in this Deal Room",
            )

        clarification.answered_by_id = user_id
        clarification.answer = payload.answer.strip()
        clarification.status = DealRoomClarificationStatus.RESOLVED.value
        clarification.answered_at = datetime.now(UTC)

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.CLARIFICATION_ANSWERED.value,
            title="Clarification resolved",
            details=f"Answer recorded for question: {clarification.question[:80]}...",
        )
        db.add(activity)
        db.commit()

        loaded = (
            db.query(DealRoomClarification)
            .options(
                joinedload(DealRoomClarification.asked_by),
                joinedload(DealRoomClarification.answered_by),
            )
            .filter(DealRoomClarification.id == clarification.id)
            .first()
        )
        return _clarification_to_response(loaded or clarification)

    def list_clarifications(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> list[DealRoomClarificationResponse]:
        """List all clarifications in the workspace."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        items = (
            db.query(DealRoomClarification)
            .options(
                joinedload(DealRoomClarification.asked_by),
                joinedload(DealRoomClarification.answered_by),
            )
            .filter(DealRoomClarification.room_id == room.id)
            .order_by(DealRoomClarification.created_at.desc())
            .all()
        )
        return [_clarification_to_response(c) for c in items]

    def add_document(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        payload: DealRoomDocumentCreatePayload,
    ) -> DealRoomDocumentResponse:
        """Attach a shared reference link or document specification."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        doc = DealRoomDocument(
            room_id=room.id,
            uploaded_by_id=user_id,
            title=payload.title.strip(),
            document_type=payload.document_type.value,
            reference_url=payload.reference_url.strip(),
            description=payload.description.strip() if payload.description else None,
        )
        db.add(doc)
        db.flush()

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.DOCUMENT_ATTACHED.value,
            title="Document attached",
            details=f"Shared reference '{doc.title}' ({doc.document_type}) added.",
        )
        db.add(activity)
        db.commit()

        loaded = (
            db.query(DealRoomDocument)
            .options(joinedload(DealRoomDocument.uploaded_by))
            .filter(DealRoomDocument.id == doc.id)
            .first()
        )
        return _document_to_response(loaded or doc)

    def delete_document(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        document_id: str,
    ) -> None:
        """Delete a shared document reference (uploader only)."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        doc = (
            db.query(DealRoomDocument)
            .filter(
                DealRoomDocument.id == document_id,
                DealRoomDocument.room_id == room.id,
            )
            .first()
        )
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{document_id}' not found in this Deal Room",
            )

        if doc.uploaded_by_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the document uploader can remove this reference",
            )

        doc_title = doc.title
        db.delete(doc)

        activity = DealRoomActivity(
            room_id=room.id,
            actor_id=user_id,
            activity_type=DealRoomActivityType.DOCUMENT_DELETED.value,
            title="Document removed",
            details=f"Shared reference '{doc_title}' was deleted.",
        )
        db.add(activity)
        db.commit()

    def list_documents(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> list[DealRoomDocumentResponse]:
        """List all documents and references in the workspace."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        docs = (
            db.query(DealRoomDocument)
            .options(joinedload(DealRoomDocument.uploaded_by))
            .filter(DealRoomDocument.room_id == room.id)
            .order_by(DealRoomDocument.created_at.desc())
            .all()
        )
        return [_document_to_response(d) for d in docs]

    def list_activities(
        self,
        db: Session,
        user_id: str,
        room_id: str,
    ) -> list[DealRoomActivityResponse]:
        """List chronological workspace activity audit log."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        activities = (
            db.query(DealRoomActivity)
            .options(joinedload(DealRoomActivity.actor))
            .filter(DealRoomActivity.room_id == room.id)
            .order_by(DealRoomActivity.created_at.desc())
            .all()
        )
        return [_activity_to_response(a) for a in activities]

    async def analyze_with_ai(
        self,
        db: Session,
        user_id: str,
        room_id: str,
        analysis_type: str,
    ) -> DealRoomAIAnalysisResponse:
        """Run grounded AI agreement understanding with transparent provenance."""
        room = self._get_room_or_404(db, room_id)
        self._verify_participant(room, user_id)

        copilot = GeminiDealRoomCopilot(api_key=settings.AI_API_KEY)
        return await copilot.analyze(room, analysis_type=analysis_type)
