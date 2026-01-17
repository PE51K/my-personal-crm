"""Dependency injection for FastAPI endpoints."""

import uuid
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import Settings, get_settings
from app.db.database import get_db
from app.utils.errors import (
    AuthForbiddenError,
    AuthTokenExpiredError,
    AuthTokenInvalidError,
    AuthUnauthorizedError,
)
from app.utils.security import (
    TokenExpiredError,
    TokenInvalidError,
    TokenPayload,
    extract_bearer_token,
    verify_jwt_token,
)
from app.models import AppOwner


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
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get current authenticated user.

    Verifies that the token belongs to the app owner by checking
    the app_owner table.

    Args:
        token_payload: Verified JWT token payload.
        db: Database session.

    Returns:
        User information dictionary.

    Raises:
        AuthForbiddenError: If user is not the app owner.
    """
    try:
        user_id = uuid.UUID(token_payload.sub)
    except ValueError as e:
        raise AuthTokenInvalidError(detail="Invalid user ID in token") from e

    # Check if user is the app owner
    result = await db.execute(
        select(AppOwner).where(AppOwner.user_id == user_id)
    )
    owner = result.scalar_one_or_none()

    if not owner:
        raise AuthForbiddenError

    return {
        "id": str(owner.user_id),
        "email": owner.email or token_payload.email,
        "created_at": owner.created_at,
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
DBSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
