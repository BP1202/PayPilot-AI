from typing import Annotated

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.repositories.business_repository import BusinessRepository
from app.schemas.business import (
    BusinessCreate,
    BusinessProfileExtraction,
    BusinessProfileExtractRequest,
    BusinessRead,
)
from app.services.business_extractor import BusinessProfileExtractor
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/business", tags=["Business Profile"])


@router.post(
    "/extract",
    response_model=BusinessProfileExtraction,
    status_code=status.HTTP_200_OK,
    summary="Extract structured business profile from natural language description",
)
def extract_business_profile(
    payload: BusinessProfileExtractRequest,
) -> BusinessProfileExtraction:
    extractor = BusinessProfileExtractor()
    return extractor.extract(payload.description)


@router.post(
    "",
    response_model=BusinessRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create and persist confirmed business profile",
)
def create_business_profile(
    business_in: BusinessCreate,
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> BusinessRead:
    repo = BusinessRepository(db)
    # Strictly associate profile with verified authenticated user; prevent body overrides
    business_in.user_id = user_id

    created = repo.create(business_in)
    return BusinessRead.model_validate(created)


@router.get(
    "/me",
    response_model=BusinessRead,
    status_code=status.HTTP_200_OK,
    summary="Get business profile for current authenticated user",
)
def get_my_business_profile(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> BusinessRead:
    repo = BusinessRepository(db)
    user_biz = repo.get_by_user_id(user_id)
    if user_biz:
        return BusinessRead.model_validate(user_biz)

    default_biz = repo.get_or_create_default_business(user_id=user_id)
    return BusinessRead.model_validate(default_biz)


@router.get(
    "",
    response_model=list[BusinessRead],
    status_code=status.HTTP_200_OK,
    summary="List all business profiles for current authenticated user",
)
def list_business_profiles(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> list[BusinessRead]:
    repo = BusinessRepository(db)
    businesses = repo.list_by_user_id(user_id)
    if not businesses:
        default_biz = repo.get_or_create_default_business(user_id=user_id)
        return [BusinessRead.model_validate(default_biz)]
    return [BusinessRead.model_validate(b) for b in businesses]
