"""Proposals API router — proposal lifecycle endpoints."""

from typing import Annotated

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.proposal import (
    ProposalActionPayload,
    ProposalCreatePayload,
    ProposalListResponse,
    ProposalResponse,
    ProposalRevisionPayload,
)
from app.services.proposal_service import ProposalService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/proposals", tags=["proposals"])


# ---------------------------------------------------------------------------
# Proposal Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new proposal on an accepted connection",
)
def create_proposal(
    payload: ProposalCreatePayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProposalResponse:
    """Create a proposal.

    Requires the referenced connection to be in ACCEPTED status.
    The caller must be a participant of that connection.
    Budget values are stored as Decimal (never float).
    """
    service = ProposalService()
    return service.create_proposal(db=db, user_id=current_user.id, payload=payload)


@router.get(
    "",
    response_model=ProposalListResponse,
    summary="List proposals the authenticated user is involved in",
)
def list_proposals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    role: Annotated[
        str,
        Query(
            pattern="^(sent|received|all)$",
            description="Filter role: sent | received | all",
        ),
    ] = "all",
) -> ProposalListResponse:
    service = ProposalService()
    items = service.list_proposals(db=db, user_id=current_user.id, role=role)
    return ProposalListResponse(items=items, total=len(items))


@router.get(
    "/{proposal_id}",
    response_model=ProposalResponse,
    summary="Get proposal details with full revision history",
)
def get_proposal(
    proposal_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProposalResponse:
    service = ProposalService()
    return service.get_proposal(db=db, user_id=current_user.id, proposal_id=proposal_id)


@router.post(
    "/{proposal_id}/revisions",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit a new revision to an existing proposal",
)
def submit_revision(
    proposal_id: str,
    payload: ProposalRevisionPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProposalResponse:
    """Submit a revision.

    Only the proposer can submit revisions.
    Status must be REVISION_REQUESTED or DRAFT.
    Revision history is preserved automatically.
    """
    service = ProposalService()
    return service.submit_revision(
        db=db,
        user_id=current_user.id,
        proposal_id=proposal_id,
        payload=payload,
    )


@router.post(
    "/{proposal_id}/respond",
    response_model=ProposalResponse,
    status_code=status.HTTP_200_OK,
    summary="Accept, reject, request revision, or withdraw a proposal",
)
def respond_to_proposal(
    proposal_id: str,
    payload: ProposalActionPayload,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProposalResponse:
    """State transition endpoint for proposals.

    - ACCEPT / REJECT / REQUEST_REVISION: recipient only.
    - WITHDRAW: proposer only.
    """
    service = ProposalService()
    return service.respond_to_proposal(
        db=db,
        user_id=current_user.id,
        proposal_id=proposal_id,
        payload=payload,
    )
