from typing import Annotated

from app.core.auth import (
    get_current_user_id,
    get_optional_user,
    get_optional_user_id,
)
from app.core.database import get_db
from app.models.opportunity import (
    OpportunityCategory,
    OpportunityIntent,
    OpportunityVisibility,
)
from app.models.user import User
from app.schemas.opportunity import (
    OpportunityAnalyzeRequest,
    OpportunityAnalyzeResponse,
    OpportunityCloseRequest,
    OpportunityCreate,
    OpportunityDiscoveryResponse,
    OpportunityListResponse,
    OpportunityPublishRequest,
    OpportunityReanalyzeRequest,
    OpportunityResponse,
    OpportunityUpdate,
    OpportunityVisibilityUpdateRequest,
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
    summary="Analyze an idea or problem submission using AI Business Analyst (Public exploratory policy)",
)
async def analyze_opportunity(
    payload: OpportunityAnalyzeRequest,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
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
        Query(
            alias="status",
            description="Filter by status (e.g. DRAFT, ANALYSED, PUBLISHED, CLOSED)",
        ),
    ] = None,
    intent_filter: Annotated[
        OpportunityIntent | None,
        Query(
            alias="intent",
            description="Filter by intent (e.g. SEEKING_SOLUTION, OFFERING_SOLUTION)",
        ),
    ] = None,
    category_filter: Annotated[
        OpportunityCategory | None,
        Query(
            alias="category",
            description="Filter by category (e.g. FINTECH, TECH, BUSINESS, LOCAL)",
        ),
    ] = None,
    visibility_filter: Annotated[
        OpportunityVisibility | None,
        Query(
            alias="visibility",
            description="Filter by visibility (PRIVATE, AUTHENTICATED, PUBLIC)",
        ),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> OpportunityListResponse:
    items, total = service.list_user_opportunities(
        user_id=user_id,
        status_filter=status_filter,
        intent_filter=intent_filter.value if intent_filter else None,
        category_filter=category_filter.value if category_filter else None,
        visibility_filter=visibility_filter.value if visibility_filter else None,
        limit=limit,
        offset=offset,
    )
    return OpportunityListResponse(
        items=[OpportunityResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get(
    "/published",
    response_model=OpportunityDiscoveryResponse,
    summary="List published opportunities across the network with search, filtering, and visibility enforcement",
)
def list_published_opportunities(
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    optional_user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
    q: Annotated[
        str | None,
        Query(
            alias="q",
            max_length=100,
            description="Keyword search across title, description, industry, or skills",
        ),
    ] = None,
    intent_filter: Annotated[
        OpportunityIntent | None,
        Query(
            alias="intent",
            description="Filter by intent (SEEKING_SOLUTION, OFFERING_SOLUTION)",
        ),
    ] = None,
    category_filter: Annotated[
        OpportunityCategory | None,
        Query(
            alias="category",
            description="Filter by category (FINTECH, TECH, BUSINESS, LOCAL)",
        ),
    ] = None,
    industry_filter: Annotated[
        str | None,
        Query(
            alias="industry",
            max_length=100,
            description="Filter by industry sector",
        ),
    ] = None,
    skill_filter: Annotated[
        str | None,
        Query(
            alias="skill",
            max_length=100,
            description="Filter by required skill or capability",
        ),
    ] = None,
    sort: Annotated[
        str,
        Query(
            pattern="^(newest|oldest)$",
            description="Sort order: 'newest' (default) or 'oldest'",
        ),
    ] = "newest",
    page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
    limit: Annotated[int, Query(ge=1, le=100, description="Results per page")] = 12,
) -> OpportunityDiscoveryResponse:
    return service.list_public_opportunities(
        requester_id=optional_user_id,
        q=q,
        intent_filter=intent_filter.value if intent_filter else None,
        category_filter=category_filter.value if category_filter else None,
        industry_filter=industry_filter,
        skill_filter=skill_filter,
        sort=sort,
        page=page,
        limit=limit,
    )


@router.get(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    summary="Retrieve an opportunity draft or published profile by ID with visibility enforcement",
)
def get_opportunity(
    opportunity_id: str,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    optional_user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
) -> OpportunityResponse:
    opp = service.get_opportunity(
        opportunity_id=opportunity_id, requester_id=optional_user_id
    )
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


@router.post(
    "/{opportunity_id}/publish",
    response_model=OpportunityResponse,
    status_code=status.HTTP_200_OK,
    summary="Publish an opportunity draft with creator authorization and validation",
)
def publish_opportunity(
    opportunity_id: str,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
    payload: OpportunityPublishRequest | None = None,
) -> OpportunityResponse:
    target_vis = payload.visibility if payload else OpportunityVisibility.PUBLIC
    opp = service.publish_opportunity(
        opportunity_id=opportunity_id,
        user_id=user_id,
        target_visibility=target_vis,
    )
    return OpportunityResponse.model_validate(opp)


@router.post(
    "/{opportunity_id}/unpublish",
    response_model=OpportunityResponse,
    status_code=status.HTTP_200_OK,
    summary="Unpublish an active opportunity back to a private draft",
)
def unpublish_opportunity(
    opportunity_id: str,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = service.unpublish_opportunity(opportunity_id=opportunity_id, user_id=user_id)
    return OpportunityResponse.model_validate(opp)


@router.post(
    "/{opportunity_id}/close",
    response_model=OpportunityResponse,
    status_code=status.HTTP_200_OK,
    summary="Close an opportunity",
)
def close_opportunity(
    opportunity_id: str,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
    payload: OpportunityCloseRequest | None = None,
) -> OpportunityResponse:
    opp = service.close_opportunity(
        opportunity_id=opportunity_id,
        user_id=user_id,
        reason=payload.reason if payload else None,
    )
    return OpportunityResponse.model_validate(opp)


@router.put(
    "/{opportunity_id}/visibility",
    response_model=OpportunityResponse,
    status_code=status.HTTP_200_OK,
    summary="Update visibility policy for an opportunity",
)
def update_opportunity_visibility(
    opportunity_id: str,
    payload: OpportunityVisibilityUpdateRequest,
    service: Annotated[OpportunityService, Depends(get_opportunity_service)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> OpportunityResponse:
    opp = service.update_visibility(
        opportunity_id=opportunity_id,
        user_id=user_id,
        visibility=payload.visibility,
    )
    return OpportunityResponse.model_validate(opp)
