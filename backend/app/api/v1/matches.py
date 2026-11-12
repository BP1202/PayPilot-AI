from typing import Annotated

from app.core.auth import get_current_user_id, get_optional_user_id
from app.core.database import get_db
from app.schemas.matching import (
    OpportunityMatchesResponse,
    ParticipantMatchesResponse,
)
from app.services.matchmaking_service import MatchmakingService
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/matches", tags=["matches"])


def get_matchmaking_service(
    db: Annotated[Session, Depends(get_db)],
) -> MatchmakingService:
    return MatchmakingService(db)


@router.get(
    "/opportunities",
    response_model=OpportunityMatchesResponse,
    summary="Get recommended opportunities matching the authenticated user's capabilities",
)
async def get_recommended_opportunities(
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[MatchmakingService, Depends(get_matchmaking_service)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> OpportunityMatchesResponse:
    """Returns published opportunities aligned with the user's registered individual and business skills.

    Security & Privacy:
    - Target opportunities must be PUBLISHED and non-closed.
    - Visibility enforced: PUBLIC or AUTHENTICATED.
    - Non-self constraint: User's own opportunities are excluded.
    """
    return await service.find_opportunities_for_user(user_id=user_id, limit=limit)


@router.get(
    "/participants/{opportunity_id}",
    response_model=ParticipantMatchesResponse,
    summary="Get candidate participants for an opportunity owned by the caller",
)
async def get_candidate_participants(
    opportunity_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    service: Annotated[MatchmakingService, Depends(get_matchmaking_service)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> ParticipantMatchesResponse:
    """Returns candidate individuals and businesses with capabilities matching the opportunity's criteria.

    Security & Privacy:
    - Only the creator of the opportunity can view candidate recommendations.
    - Private profiles are excluded.
    - Non-self constraint: The creator's own profile and businesses are excluded.
    - Contact PII (email, phone, private UUIDs) is not exposed.
    """
    try:
        return await service.find_participants_for_opportunity(
            opportunity_id=opportunity_id, user_id=user_id, limit=limit
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        ) from err
    except PermissionError as err:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(err),
        ) from err


@router.get(
    "/complementary/{opportunity_id}",
    response_model=OpportunityMatchesResponse,
    summary="Get complementary opportunities (SEEKING vs OFFERING) across the network",
)
async def get_complementary_opportunities(
    opportunity_id: str,
    service: Annotated[MatchmakingService, Depends(get_matchmaking_service)],
    optional_user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> OpportunityMatchesResponse:
    """Returns published opportunities on the network with complementary intent (SEEKING <-> OFFERING).

    Security & Privacy:
    - Guests receive only PUBLIC opportunities.
    - Authenticated users receive PUBLIC and AUTHENTICATED opportunities.
    - Target opportunity is excluded from its own result set.
    """
    try:
        return await service.find_complementary_opportunities(
            opportunity_id=opportunity_id, user_id=optional_user_id, limit=limit
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(err),
        ) from err
