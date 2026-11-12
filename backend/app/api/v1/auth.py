from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.individual_profile_repository import IndividualProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import TokenResponse, UserLogin, UserRead, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account with cryptographic credentials",
)
def register(
    payload: UserRegister,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    repo = UserRepository(db)
    existing_user = repo.get_by_email(payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = User(
        id=repo.generate_id(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=True,
    )
    created_user = repo.create(user)
    IndividualProfileRepository(db).get_or_create(created_user.id)

    expires_delta = timedelta(minutes=settings.AUTH_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        user_id=created_user.id,
        email=created_user.email,
        expires_delta=expires_delta,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=int(expires_delta.total_seconds()),
        user=UserRead.model_validate(created_user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and issue verifiable JWT access token",
)
def login(
    payload: UserLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    repo = UserRepository(db)
    user = repo.get_by_email(payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )

    expires_delta = timedelta(minutes=settings.AUTH_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        expires_delta=expires_delta,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=int(expires_delta.total_seconds()),
        user=UserRead.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated user profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    return UserRead.model_validate(current_user)
