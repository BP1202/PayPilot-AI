from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    ExpiredTokenError,
    InvalidTokenError,
    decode_access_token,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> User:
    """Authenticates the request by cryptographically verifying the Bearer JWT token.

    Security guarantees:
    - Never trusts client-supplied headers like X-User-ID.
    - Rejects missing, malformed, expired, or tampered tokens with HTTP 401.
    - Derives the authenticated identity strictly from the verified token subject claim.
    """
    if not authorization or not authorization.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()

    try:
        payload = decode_access_token(token)
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_user_id(
    current_user: Annotated[User, Depends(get_current_user)],
) -> str:
    """Returns the verified user ID from the cryptographically validated user identity."""
    return current_user.id


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> User | None:
    """Extracts verified identity if an Authorization header is provided, or returns None.

    If an Authorization header is provided, it must be valid; malformed or expired
    tokens are rejected with 401.
    """
    if not authorization or not authorization.strip():
        return None
    return get_current_user(db=db, authorization=authorization)


def get_optional_user_id(
    optional_user: Annotated[User | None, Depends(get_optional_user)],
) -> str | None:
    """Returns the verified user ID from optional identity, or None if guest."""
    return optional_user.id if optional_user else None
