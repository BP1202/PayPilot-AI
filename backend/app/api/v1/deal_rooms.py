"""Deal Rooms API router — endpoints for collaborative Deal Room workspaces."""

from typing import Annotated

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.deal_room import DealRoomStatus
from app.models.user import User
from app.schemas.deal_room import (
    DealRoomActivityResponse,
    DealRoomAIAnalysisRequest,
    DealRoomAIAnalysisResponse,
    DealRoomClarificationAnswerPayload,
    DealRoomClarificationCreatePayload,
    DealRoomClarificationResponse,
    DealRoomCreatePayload,
    DealRoomDocumentCreatePayload,
    DealRoomDocumentResponse,
    DealRoomListResponse,
    DealRoomNoteCreatePayload,
    DealRoomNoteResponse,
    DealRoomOverviewResponse,
    DealRoomResponse,
    DealRoomStatusUpdatePayload,
)
from app.services.deal_room_service import DealRoomService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/deal-rooms", tags=["deal-rooms"])


@router.post(
    "",
    response_model=DealRoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or initialize a Deal Room workspace from an accepted proposal",
)
def create_deal_room(
    payload: DealRoomCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomResponse:
    service = DealRoomService()
    return service.create_deal_room(db=db, user_id=current_user.id, payload=payload)


@router.get(
    "",
    response_model=DealRoomListResponse,
    summary="List Deal Rooms the authenticated user is participating in",
)
def list_deal_rooms(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    status_filter: Annotated[
        DealRoomStatus | None,
        Query(alias="status", description="Filter by room status"),
    ] = None,
) -> DealRoomListResponse:
    service = DealRoomService()
    items = service.list_user_deal_rooms(
        db=db, user_id=current_user.id, status_filter=status_filter
    )
    return DealRoomListResponse(items=items, total=len(items))


@router.get(
    "/{room_id}",
    response_model=DealRoomResponse,
    summary="Get full Deal Room details with agreed terms snapshot and participants",
)
def get_deal_room(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomResponse:
    service = DealRoomService()
    return service.get_deal_room(db=db, user_id=current_user.id, room_id=room_id)


@router.get(
    "/{room_id}/overview",
    response_model=DealRoomOverviewResponse,
    summary="Get Deal Room overview metrics, milestone counts, and recent activity",
)
def get_deal_room_overview(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomOverviewResponse:
    service = DealRoomService()
    return service.get_deal_room_overview(
        db=db, user_id=current_user.id, room_id=room_id
    )


@router.post(
    "/{room_id}/status",
    response_model=DealRoomResponse,
    summary="Transition Deal Room lifecycle state",
)
def update_deal_room_status(
    room_id: str,
    payload: DealRoomStatusUpdatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomResponse:
    service = DealRoomService()
    return service.update_status(
        db=db, user_id=current_user.id, room_id=room_id, payload=payload
    )


@router.get(
    "/{room_id}/notes",
    response_model=list[DealRoomNoteResponse],
    summary="List shared notes in the Deal Room",
)
def list_deal_room_notes(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DealRoomNoteResponse]:
    service = DealRoomService()
    return service.list_notes(db=db, user_id=current_user.id, room_id=room_id)


@router.post(
    "/{room_id}/notes",
    response_model=DealRoomNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a shared note to the Deal Room",
)
def add_deal_room_note(
    room_id: str,
    payload: DealRoomNoteCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomNoteResponse:
    service = DealRoomService()
    return service.add_note(
        db=db, user_id=current_user.id, room_id=room_id, payload=payload
    )


@router.get(
    "/{room_id}/clarifications",
    response_model=list[DealRoomClarificationResponse],
    summary="List clarifications and questions in the Deal Room",
)
def list_deal_room_clarifications(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DealRoomClarificationResponse]:
    service = DealRoomService()
    return service.list_clarifications(db=db, user_id=current_user.id, room_id=room_id)


@router.post(
    "/{room_id}/clarifications",
    response_model=DealRoomClarificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ask a clarification or submit a question",
)
def ask_deal_room_clarification(
    room_id: str,
    payload: DealRoomClarificationCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomClarificationResponse:
    service = DealRoomService()
    return service.ask_clarification(
        db=db, user_id=current_user.id, room_id=room_id, payload=payload
    )


@router.post(
    "/{room_id}/clarifications/{clarification_id}/answer",
    response_model=DealRoomClarificationResponse,
    summary="Answer an open clarification question",
)
def answer_deal_room_clarification(
    room_id: str,
    clarification_id: str,
    payload: DealRoomClarificationAnswerPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomClarificationResponse:
    service = DealRoomService()
    return service.answer_clarification(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        clarification_id=clarification_id,
        payload=payload,
    )


@router.get(
    "/{room_id}/documents",
    response_model=list[DealRoomDocumentResponse],
    summary="List documents and reference links in the Deal Room",
)
def list_deal_room_documents(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DealRoomDocumentResponse]:
    service = DealRoomService()
    return service.list_documents(db=db, user_id=current_user.id, room_id=room_id)


@router.post(
    "/{room_id}/documents",
    response_model=DealRoomDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Attach a reference link or document specification",
)
def add_deal_room_document(
    room_id: str,
    payload: DealRoomDocumentCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomDocumentResponse:
    service = DealRoomService()
    return service.add_document(
        db=db, user_id=current_user.id, room_id=room_id, payload=payload
    )


@router.delete(
    "/{room_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a document reference (uploader only)",
)
def delete_deal_room_document(
    room_id: str,
    document_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = DealRoomService()
    service.delete_document(
        db=db, user_id=current_user.id, room_id=room_id, document_id=document_id
    )


@router.get(
    "/{room_id}/activity",
    response_model=list[DealRoomActivityResponse],
    summary="List Deal Room chronological activity audit trail",
)
def list_deal_room_activity(
    room_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[DealRoomActivityResponse]:
    service = DealRoomService()
    return service.list_activities(db=db, user_id=current_user.id, room_id=room_id)


@router.post(
    "/{room_id}/ai/analyze",
    response_model=DealRoomAIAnalysisResponse,
    summary="Run AI Deal Room Copilot analysis with transparent provenance",
)
async def analyze_deal_room_ai(
    room_id: str,
    payload: DealRoomAIAnalysisRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DealRoomAIAnalysisResponse:
    service = DealRoomService()
    return await service.analyze_with_ai(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        analysis_type=payload.analysis_type,
    )
