"""Dependency injection for FastAPI endpoints."""

from typing import Annotated

from fastapi import Depends, Header
from supabase import Client, create_client

from app.core.config import Settings, get_settings
from app.core.errors import (
    AuthForbiddenError,
    AuthTokenExpiredError,
    AuthTokenInvalidError,
    AuthUnauthorizedError,
)
from app.core.security import (
    TokenExpiredError,
    TokenInvalidError,
    TokenPayload,
    extract_bearer_token,
    verify_jwt_token,
)


def get_supabase_client(
    settings: Annotated[Settings, Depends(get_settings)],
) -> Client:
    """Get Supabase client instance.

    Creates a Supabase client using the service role key for
    full database access. This should only be used in backend
    operations where RLS needs to be bypassed.

    Args:
        settings: Application settings.

    Returns:
        Supabase client instance.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


async def get_token_payload(
    authorization: Annotated[str | None, Header()] = None,
) -> TokenPayload:
    """Extract and verify JWT token from Authorization header.

    Args:
        authorization: Authorization header value.

    Returns:
        Verified token payload.

    Raises:
        AuthUnauthorizedError: If no token is provided.
        AuthTokenExpiredError: If token has expired.
        AuthTokenInvalidError: If token is invalid.
    """
    token = extract_bearer_token(authorization)
    if not token:
        raise AuthUnauthorizedError

    try:
        return verify_jwt_token(token)
    except TokenExpiredError as e:
        raise AuthTokenExpiredError from e
    except TokenInvalidError as e:
        raise AuthTokenInvalidError(detail=e.message) from e


async def get_current_user(
    token_payload: Annotated[TokenPayload, Depends(get_token_payload)],
    supabase: Annotated[Client, Depends(get_supabase_client)],
) -> dict:
    """Get current authenticated user.

    Verifies that the token belongs to the app owner by checking
    the app_owner table.

    Args:
        token_payload: Verified JWT token payload.
        supabase: Supabase client instance.

    Returns:
        User information dictionary.

    Raises:
        AuthForbiddenError: If user is not the app owner.
    """
    user_id = token_payload.sub

    # Check if user is the app owner
    result = supabase.table("app_owner").select("*").eq("supabase_user_id", user_id).execute()

    if not result.data:
        raise AuthForbiddenError

    owner = result.data[0]
    return {
        "id": user_id,
        "email": owner.get("email") or token_payload.email,
        "created_at": owner.get("created_at"),
    }


async def get_current_owner(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """Alias for get_current_user that explicitly indicates owner requirement.

    All protected endpoints require the owner, so this is functionally
    the same as get_current_user but makes the intent clearer in endpoint
    signatures.

    Args:
        current_user: Current authenticated user (must be owner).

    Returns:
        Owner user information.
    """
    return current_user


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentOwner = Annotated[dict, Depends(get_current_owner)]
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
AppSettings = Annotated[Settings, Depends(get_settings)]
