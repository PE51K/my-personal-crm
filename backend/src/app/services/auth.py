"""Authentication business logic."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.models import AppOwner
from app.schemas.auth import AuthTokenResponse, UserResponse
from app.utils.errors import (
    AuthAlreadyInitializedError,
    AuthInvalidCredentialsError,
    InternalError,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)


async def check_bootstrap_status(db: AsyncSession) -> bool:
    """Check if the application has been initialized with an owner.

    Args:
        db: Database session.

    Returns:
        True if app_owner exists, False otherwise.
    """
    result = await db.execute(select(AppOwner).limit(1))
    owner = result.scalar_one_or_none()
    return owner is not None


async def bootstrap_owner(
    db: AsyncSession,
    email: str,
    password: str,
) -> AuthTokenResponse:
    """Create the owner account and initialize the application.

    Creates the app_owner record with hashed password.

    Args:
        db: Database session.
        email: Owner's email address.
        password: Owner's password.

    Returns:
        Authentication token response with user and tokens.

    Raises:
        AuthAlreadyInitializedError: If app_owner already exists.
        InternalError: If any step fails.
    """
    settings = get_settings()

    # Check if already initialized
    if await check_bootstrap_status(db):
        raise AuthAlreadyInitializedError

    try:
        # Generate user ID
        user_id = uuid.uuid4()

        # Hash password
        password_hash = hash_password(password)

        # Create app_owner record
        owner = AppOwner(
            id=1,
            user_id=user_id,
            email=email,
            password_hash=password_hash,
        )
        db.add(owner)
        await db.flush()  # Flush to get created_at

        # Generate tokens
        access_token = create_access_token(str(user_id), email)
        refresh_token = create_refresh_token(str(user_id), email)

        # Commit transaction
        await db.commit()

        return AuthTokenResponse(
            user=UserResponse(
                id=str(user_id),
                email=email,
                created_at=owner.created_at,
            ),
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.security.access_token_expire_minutes * 60,
        )

    except AuthAlreadyInitializedError:
        raise
    except Exception as e:
        await db.rollback()
        logger.exception("Unexpected error during bootstrap")
        raise InternalError(detail=str(e)) from e


async def login_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> AuthTokenResponse:
    """Authenticate user and return tokens.

    Args:
        db: Database session.
        email: User's email address.
        password: User's password.

    Returns:
        Authentication token response with user and tokens.

    Raises:
        AuthInvalidCredentialsError: If credentials are invalid.
        InternalError: If authentication fails unexpectedly.
    """
    settings = get_settings()

    try:
        # Get owner by email
        result = await db.execute(select(AppOwner).where(AppOwner.email == email))
        owner = result.scalar_one_or_none()

        # Check if owner exists and has password hash
        if not owner or not owner.password_hash:
            raise AuthInvalidCredentialsError

        # Verify password
        if not verify_password(password, owner.password_hash):
            raise AuthInvalidCredentialsError

        # Generate tokens
        user_id_str = str(owner.user_id)
        access_token = create_access_token(user_id_str, owner.email)
        refresh_token = create_refresh_token(user_id_str, owner.email)

        return AuthTokenResponse(
            user=UserResponse(
                id=user_id_str,
                email=owner.email,
                created_at=owner.created_at,
            ),
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.security.access_token_expire_minutes * 60,
        )

    except AuthInvalidCredentialsError:
        raise
    except Exception as e:
        logger.exception("Unexpected error during login")
        raise InternalError(detail=str(e)) from e


async def logout_user(db: AsyncSession, refresh_token: str) -> None:
    """Invalidate user session.

    With JWT-based auth, we don't need to do anything server-side for logout.
    The client should discard the tokens. This function exists for API compatibility.

    Args:
        db: Database session (unused).
        refresh_token: Refresh token to invalidate (unused).
    """
    # With stateless JWT tokens, logout is handled client-side
    # Token blacklisting could be implemented here if needed
