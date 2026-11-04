"""Profile visibility and privacy policy enforcement.

Enforces visibility rules:
- Owner always sees full profile.
- PRIVATE: non-owners denied with HTTP 403.
- AUTHENTICATED: unauthenticated requests denied with HTTP 401; authenticated non-owners see limited public fields.
- PUBLIC: anyone can see limited public fields.
- Limited payloads never include credentials, emails, or internal auth tokens.
"""

from fastapi import HTTPException, status

from app.models.business import Business
from app.models.profile import IndividualProfile, ProfileVisibility


def check_individual_access(
    profile: IndividualProfile,
    requester_id: str | None,
) -> bool:
    """Checks whether the requester can view the individual profile.

    Returns True if requester is the owner (full access).
    Returns False if requester is a non-owner with public/authenticated access.
    Raises HTTPException (401/403) if access is denied.
    """
    is_owner = requester_id is not None and requester_id == profile.user_id
    if is_owner:
        return True

    vis = (profile.visibility or ProfileVisibility.PRIVATE.value).upper()

    if vis == ProfileVisibility.PRIVATE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private.",
        )
    elif vis == ProfileVisibility.AUTHENTICATED.value:
        if not requester_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view this profile.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return False
    elif vis == ProfileVisibility.PUBLIC.value:
        return False
    else:
        # Default fail-safe to private
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This profile is private.",
        )


def check_business_access(
    business: Business,
    requester_id: str | None,
) -> bool:
    """Checks whether the requester can view the business profile.

    Returns True if requester is the owner (full access).
    Returns False if requester is a non-owner with public/authenticated access.
    Raises HTTPException (401/403) if access is denied.
    """
    is_owner = (
        requester_id is not None
        and business.user_id is not None
        and requester_id == business.user_id
    )
    if is_owner:
        return True

    vis = (business.visibility or "PRIVATE").upper()

    if vis == ProfileVisibility.PRIVATE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This business profile is private.",
        )
    elif vis == ProfileVisibility.AUTHENTICATED.value:
        if not requester_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view this business profile.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return False
    elif vis == ProfileVisibility.PUBLIC.value:
        return False
    else:
        # Default fail-safe to private
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This business profile is private.",
        )

