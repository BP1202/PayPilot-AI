"""ConnectionService — business logic for connection requests lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.models.collaboration_activity import CollaborationActivity
from app.models.connection import Connection, ConnectionIntent, ConnectionStatus
from app.models.opportunity import Opportunity, OpportunityVisibility
from app.models.profile import IndividualProfile
from app.models.user import User
from app.schemas.connection import (
    ConnectionCreatePayload,
    ConnectionListResponse,
    ConnectionRespondPayload,
    ConnectionResponse,
    ParticipantCard,
)


def _build_participant_card(user: User) -> ParticipantCard:
    """Build a ParticipantCard from a User ORM object (with optional profile)."""
    profile: IndividualProfile | None = getattr(user, "individual_profile", None)
    return ParticipantCard(
        user_id=user.id,
        full_name=user.full_name,
        headline=profile.headline if profile else None,
        industry=profile.industry if profile else None,
        skills=list(profile.skills) if profile else [],
    )


def _build_connection_response(conn: Connection) -> ConnectionResponse:
    """Map a Connection ORM object to ConnectionResponse schema."""
    opp_title: str | None = None
    if conn.opportunity is not None:
        opp_title = conn.opportunity.title

    return ConnectionResponse(
        id=conn.id,
        status=ConnectionStatus(conn.status),
        intent=ConnectionIntent(conn.intent),
        message=conn.message,
        response_note=conn.response_note,
        requester=_build_participant_card(conn.requester),
        recipient=_build_participant_card(conn.recipient),
        opportunity_id=conn.opportunity_id,
        opportunity_title=opp_title,
        accepted_at=conn.accepted_at,
        declined_at=conn.declined_at,
        withdrawn_at=conn.withdrawn_at,
        created_at=conn.created_at,
    )


def _load_connection(db: Session, connection_id: str) -> Connection:
    conn = (
        db.query(Connection)
        .options(
            joinedload(Connection.requester).joinedload(User.individual_profile),
            joinedload(Connection.recipient).joinedload(User.individual_profile),
            joinedload(Connection.opportunity),
        )
        .filter(Connection.id == connection_id)
        .first()
    )
    if conn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )
    return conn


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


class ConnectionService:
    """Service responsible for connection request creation and state transitions."""

    def create_request(
        self,
        db: Session,
        sender_id: str,
        payload: ConnectionCreatePayload,
    ) -> ConnectionResponse:
        """Create a new connection request.

        Rules:
        - sender_id must not equal recipient_id (HTTP 400).
        - No existing PENDING connection between the same pair in either direction (HTTP 409).
        - If opportunity_id supplied, the opportunity must be PUBLISHED or AUTHENTICATED-visible.
        """
        if sender_id == payload.recipient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot send a connection request to yourself.",
            )

        # Verify recipient exists
        recipient = db.query(User).filter(User.id == payload.recipient_id).first()
        if not recipient or not recipient.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient user not found.",
            )

        # Duplicate PENDING check (bidirectional)
        existing = (
            db.query(Connection)
            .filter(
                Connection.status == ConnectionStatus.PENDING.value,
                or_(
                    and_(
                        Connection.requester_id == sender_id,
                        Connection.recipient_id == payload.recipient_id,
                    ),
                    and_(
                        Connection.requester_id == payload.recipient_id,
                        Connection.recipient_id == sender_id,
                    ),
                ),
            )
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending connection request already exists between these users.",
            )

        # Validate opportunity if provided
        if payload.opportunity_id:
            opp = (
                db.query(Opportunity)
                .filter(Opportunity.id == payload.opportunity_id)
                .first()
            )
            if opp is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Opportunity not found.",
                )
            if opp.visibility == OpportunityVisibility.PRIVATE.value:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot reference a private opportunity in a connection request.",
                )

        conn = Connection(
            requester_id=sender_id,
            recipient_id=payload.recipient_id,
            opportunity_id=payload.opportunity_id,
            status=ConnectionStatus.PENDING.value,
            intent=payload.intent.value,
            message=payload.message,
        )
        db.add(conn)
        db.flush()  # assign id before activities

        # Notify both parties
        _record_activity(
            db,
            user_id=sender_id,
            entity_type="CONNECTION",
            entity_id=conn.id,
            activity_type="CONNECTION_SENT",
            title="Connection request sent",
            details=f"To: {payload.recipient_id}",
        )
        _record_activity(
            db,
            user_id=payload.recipient_id,
            entity_type="CONNECTION",
            entity_id=conn.id,
            activity_type="CONNECTION_RECEIVED",
            title="New connection request received",
            details=f"From: {sender_id}",
        )

        db.commit()
        return _build_connection_response(_load_connection(db, conn.id))

    def respond_to_request(
        self,
        db: Session,
        user_id: str,
        connection_id: str,
        payload: ConnectionRespondPayload,
    ) -> ConnectionResponse:
        """Accept or decline a pending connection request.

        Only the recipient can respond. Status must be PENDING.
        """
        conn = _load_connection(db, connection_id)

        if conn.recipient_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the recipient can respond to this connection request.",
            )

        if conn.status != ConnectionStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot respond to a connection in '{conn.status}' status.",
            )

        now = datetime.now(UTC)
        if payload.action == "ACCEPT":
            conn.status = ConnectionStatus.ACCEPTED.value
            conn.accepted_at = now
            activity_type = "CONNECTION_ACCEPTED"
            title_requester = "Connection request accepted"
            title_recipient = "You accepted a connection request"
        else:
            conn.status = ConnectionStatus.DECLINED.value
            conn.declined_at = now
            activity_type = "CONNECTION_DECLINED"
            title_requester = "Connection request declined"
            title_recipient = "You declined a connection request"

        conn.response_note = payload.response_note
        conn.updated_at = now

        _record_activity(
            db,
            user_id=conn.requester_id,
            entity_type="CONNECTION",
            entity_id=conn.id,
            activity_type=activity_type,
            title=title_requester,
        )
        _record_activity(
            db,
            user_id=user_id,
            entity_type="CONNECTION",
            entity_id=conn.id,
            activity_type=activity_type,
            title=title_recipient,
        )

        db.commit()
        db.refresh(conn)
        return _build_connection_response(_load_connection(db, conn.id))

    def withdraw_request(
        self,
        db: Session,
        user_id: str,
        connection_id: str,
    ) -> ConnectionResponse:
        """Withdraw a pending connection request.

        Only the requester can withdraw. Status must be PENDING.
        """
        conn = _load_connection(db, connection_id)

        if conn.requester_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the requester can withdraw this connection request.",
            )

        if conn.status != ConnectionStatus.PENDING.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot withdraw a connection in '{conn.status}' status.",
            )

        now = datetime.now(UTC)
        conn.status = ConnectionStatus.WITHDRAWN.value
        conn.withdrawn_at = now
        conn.updated_at = now

        _record_activity(
            db,
            user_id=user_id,
            entity_type="CONNECTION",
            entity_id=conn.id,
            activity_type="CONNECTION_WITHDRAWN",
            title="Connection request withdrawn",
        )

        db.commit()
        return _build_connection_response(_load_connection(db, conn.id))

    def list_requests(
        self,
        db: Session,
        user_id: str,
        direction: str = "all",
        status_filter: str | None = None,
    ) -> ConnectionListResponse:
        """List connection requests for the user.

        direction: "incoming" | "outgoing" | "all"
        """
        q = db.query(Connection).options(
            joinedload(Connection.requester).joinedload(User.individual_profile),
            joinedload(Connection.recipient).joinedload(User.individual_profile),
            joinedload(Connection.opportunity),
        )

        if direction == "incoming":
            q = q.filter(Connection.recipient_id == user_id)
        elif direction == "outgoing":
            q = q.filter(Connection.requester_id == user_id)
        else:
            q = q.filter(
                or_(
                    Connection.requester_id == user_id,
                    Connection.recipient_id == user_id,
                )
            )

        if status_filter:
            q = q.filter(Connection.status == status_filter)

        connections = q.order_by(Connection.created_at.desc()).all()

        pending_count = sum(
            1 for c in connections if c.status == ConnectionStatus.PENDING.value
        )
        accepted_count = sum(
            1 for c in connections if c.status == ConnectionStatus.ACCEPTED.value
        )

        return ConnectionListResponse(
            items=[_build_connection_response(c) for c in connections],
            total=len(connections),
            pending_count=pending_count,
            accepted_count=accepted_count,
        )

    def list_accepted_connections(
        self,
        db: Session,
        user_id: str,
    ) -> ConnectionListResponse:
        """Return only ACCEPTED connections for the authenticated user."""
        return self.list_requests(
            db,
            user_id=user_id,
            direction="all",
            status_filter=ConnectionStatus.ACCEPTED.value,
        )
