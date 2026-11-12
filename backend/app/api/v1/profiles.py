from typing import Annotated

from app.core.auth import get_current_user_id, get_optional_user_id
from app.core.database import get_db
from app.schemas.business import BusinessPublicRead, BusinessRead, BusinessUpdate
from app.schemas.profile import (
    IndividualProfilePublicRead,
    IndividualProfileRead,
    IndividualProfileUpdate,
    ProfileMeResponse,
)
from app.services.profile_service import ProfileService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get(
    "/me",
    response_model=ProfileMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's individual and organization profiles",
)
def get_my_profiles(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> ProfileMeResponse:
    service = ProfileService(db)
    return service.get_my_profiles(current_user_id)


@router.get(
    "/me/individual",
    response_model=IndividualProfileRead,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's individual profile (get or create)",
)
def get_my_individual_profile(
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> IndividualProfileRead:
    service = ProfileService(db)
    return service.get_my_individual(current_user_id)


@router.put(
    "/me/individual",
    response_model=IndividualProfileRead,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated user's individual profile",
)
def update_my_individual_profile(
    payload: IndividualProfileUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> IndividualProfileRead:
    service = ProfileService(db)
    return service.update_my_individual(current_user_id, payload)


@router.put(
    "/me/businesses/{business_id}",
    response_model=BusinessRead,
    status_code=status.HTTP_200_OK,
    summary="Update authenticated user's organization profile",
)
def update_my_business_profile(
    business_id: int,
    payload: BusinessUpdate,
    current_user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> BusinessRead:
    service = ProfileService(db)
    return service.update_my_business(current_user_id, business_id, payload)


@router.get(
    "/individuals/{target_user_id}",
    response_model=IndividualProfileRead | IndividualProfilePublicRead,
    status_code=status.HTTP_200_OK,
    summary="Get individual profile by user_id with privacy enforcement",
)
def get_individual_profile_by_id(
    target_user_id: str,
    db: Annotated[Session, Depends(get_db)],
    optional_user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
) -> IndividualProfileRead | IndividualProfilePublicRead:
    service = ProfileService(db)
    return service.get_individual_profile(target_user_id, optional_user_id)


@router.get(
    "/organizations/{business_id}",
    response_model=BusinessRead | BusinessPublicRead,
    status_code=status.HTTP_200_OK,
    summary="Get organization profile by business_id with privacy enforcement",
)
def get_organization_profile_by_id(
    business_id: int,
    db: Annotated[Session, Depends(get_db)],
    optional_user_id: Annotated[str | None, Depends(get_optional_user_id)] = None,
) -> BusinessRead | BusinessPublicRead:
    service = ProfileService(db)
    return service.get_business_profile(business_id, optional_user_id)
