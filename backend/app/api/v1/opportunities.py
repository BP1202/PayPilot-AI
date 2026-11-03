from typing import Annotated

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.schemas.opportunity import (
    OpportunityAnalyzeRequest,
    OpportunityAnalyzeResponse,
    OpportunityCreate,
    OpportunityListResponse,
    OpportunityReanalyzeRequest,
    OpportunityResponse,
    OpportunityUpdate,
)
from app.services.opportunity_service import OpportunityService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def get_opportunity_service(
    db: Annotated[Session, Depends(get_db)],
) -> OpportunityService:
    return OpportunityService(db)


@router.post(
    "/analyze",
    response_model=OpportunityAnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze an idea or problem submission using AI Business Analyst",
)
async def analyze_opportunity(
    payload: OpportunityAnalyzeRequest,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
) -> OpportunityAnalyzeResponse:
    return await service.analyze(payload)


@router.post(
    "",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a reviewed opportunity draft",
)
def create_opportunity_draft(
    payload: OpportunityCreate,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = service.create_draft(payload, user_id=user_id)
    return OpportunityResponse.model_validate(opp)


@router.get(
    "",
    response_model=OpportunityListResponse,
    summary="List opportunities owned by the authenticated creator",
)
def list_opportunities(
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
    status_filter: Annotated[
        str | None,
        Query(alias="status", description="Filter by status (e.g. DRAFT, ANALYSED)"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OpportunityListResponse:
    items, total = service.list_user_opportunities(
        user_id=user_id,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return OpportunityListResponse(
        items=[OpportunityResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Retrieve an opportunity draft by ID",
)
def get_opportunity(
    opportunity_id: str,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = service.get_opportunity(opportunity_id=opportunity_id, user_id=user_id)
    return OpportunityResponse.model_validate(opp)


@router.put(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Update a reviewed opportunity draft",
)
def update_opportunity(
    opportunity_id: str,
    payload: OpportunityUpdate,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = service.update_opportunity(
        opportunity_id=opportunity_id, payload=payload, user_id=user_id
    )
    return OpportunityResponse.model_validate(opp)


@router.post(
    "/{opportunity_id}/reanalyze",
    response_model=OpportunityResponse,
    summary="Reanalyze an opportunity draft with updated text while preserving creator edits",
)
async def reanalyze_opportunity(
    opportunity_id: str,
    payload: OpportunityReanalyzeRequest,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = await service.reanalyze_opportunity(
        opportunity_id=opportunity_id, payload=payload, user_id=user_id
    )
    return OpportunityResponse.model_validate(opp)
