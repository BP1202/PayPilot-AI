from fastapi import Header


def get_current_user_id(
    x_user_id: str | None = Header(default=None, alias="X-User-ID"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> str:
    """Resolves the authenticated user ID for the current request.

    Prefers an explicit X-User-ID header (used by frontends/sessions),
    falls back to Bearer token string if supplied, or defaults to 'owner_default'.
    """
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        if token:
            return token

    return "owner_default"

