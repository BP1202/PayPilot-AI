"""Connections API router — connection request lifecycle endpoints."""

from typing import Annotated

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.collaboration_activity import CollaborationActivity
from app.models.user import User
from app.schemas.connection import (
    ActivityListResponse,
    ActivityResponse,
    ConnectionCreatePayload,
    ConnectionListResponse,
    ConnectionRespondPayload,
    ConnectionResponse,
)
from app.services.connection_service import ConnectionService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/connections", tags=["connections"])


def get_connection_service(
    db: Annotated[Session, Depends(get_db)],
) -> ConnectionService:
    return ConnectionService()


# ---------------------------------------------------------------------------
# Connection Request Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/requests",
    response_model=ConnectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send a connection request to another user",
)
def create_connection_request(
    payload: ConnectionCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ConnectionResponse:
    """Send a new connection request.

    Security: requester identity derived from verified JWT only.
    """
    service = ConnectionService()
    return service.create_request(db=db, sender_id=current_user.id, payload=payload)


@router.get(
    "/requests",
    response_model=ConnectionListResponse,
    summary="List connection requests (incoming, outgoing, or all)",
)
def list_connection_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    direction: Annotated[
        str,
        Query(
            pattern="^(incoming|outgoing|all)$",
            description="Filter direction: incoming | outgoing | all",
        ),
    ] = "all",
    status: Annotated[
        str | None,
        Query(
            alias="status",
            description="Filter by status (PENDING, ACCEPTED, DECLINED, WITHDRAWN)",
        ),
    ] = None,
) -> ConnectionListResponse:
    service = ConnectionService()
    return service.list_requests(
        db=db,
        user_id=current_user.id,
        direction=direction,
        status_filter=status,
    )


@router.post(
    "/{connection_id}/respond",
    response_model=ConnectionResponse,
    summary="Accept or decline a pending connection request",
)
def respond_to_connection(
    connection_id: str,
    payload: ConnectionRespondPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ConnectionResponse:
    """Only the recipient can accept or decline a pending request."""
    service = ConnectionService()
    return service.respond_to_request(
        db=db,
        user_id=current_user.id,
        connection_id=connection_id,
        payload=payload,
    )


@router.post(
    "/{connection_id}/withdraw",
    response_model=ConnectionResponse,
    summary="Withdraw a pending connection request",
)
def withdraw_connection(
    connection_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ConnectionResponse:
    """Only the requester can withdraw a pending request."""
    service = ConnectionService()
    return service.withdraw_request(
        db=db,
        user_id=current_user.id,
        connection_id=connection_id,
    )


@router.get(
    "",
    response_model=ConnectionListResponse,
    summary="List accepted connections for the authenticated user",
)
def list_accepted_connections(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ConnectionListResponse:
    service = ConnectionService()
    return service.list_accepted_connections(db=db, user_id=current_user.id)


# ---------------------------------------------------------------------------
# Activity Feed Endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/activity",
    response_model=ActivityListResponse,
    tags=["connections", "activity"],
    summary="List collaboration activity feed for the authenticated user",
)
def list_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    unread_only: Annotated[
        bool,
        Query(description="Return only unread activities when true"),
    ] = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ActivityListResponse:
    q = db.query(CollaborationActivity).filter(
        CollaborationActivity.user_id == current_user.id
    )
    if unread_only:
        q = q.filter(CollaborationActivity.is_read == False)

    total = q.count()
    unread_count = (
        db.query(CollaborationActivity)
        .filter(
            CollaborationActivity.user_id == current_user.id,
            CollaborationActivity.is_read == False,
        )
        .count()
    )

    items = (
        q.order_by(CollaborationActivity.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return ActivityListResponse(
        items=[
            ActivityResponse(
                id=a.id,
                entity_type=a.entity_type,
                entity_id=a.entity_id,
                activity_type=a.activity_type,
                title=a.title,
                details=a.details,
                is_read=a.is_read,
                created_at=a.created_at,
            )
            for a in items
        ],
        total=total,
        unread_count=unread_count,
    )
