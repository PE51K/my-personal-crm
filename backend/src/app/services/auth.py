"""Authentication business logic."""

import logging
from datetime import datetime

from supabase_auth.errors import AuthApiError
from supabase import Client

from app.core.config import get_settings
from app.core.errors import (
    AuthAlreadyInitializedError,
    AuthInvalidCredentialsError,
    InternalError,
)
from app.schemas.auth import AuthTokenResponse, UserResponse

logger = logging.getLogger(__name__)


def check_bootstrap_status(supabase: Client) -> bool:
    """Check if the application has been initialized with an owner.

    Args:
        supabase: Supabase client instance.

    Returns:
        True if app_owner exists, False otherwise.
    """
    result = supabase.table("app_owner").select("id").limit(1).execute()
    return len(result.data) > 0


def bootstrap_owner(
    supabase: Client,
    email: str,
    password: str,
) -> AuthTokenResponse:
    """Create the owner account and initialize the application.

    Creates a Supabase Auth user, inserts the app_owner record,
    and seeds default statuses.

    Args:
        supabase: Supabase client instance.
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
    if check_bootstrap_status(supabase):
        raise AuthAlreadyInitializedError

    try:
        # Create user via Supabase Auth admin API
        auth_response = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
            }
        )
        user = auth_response.user
        if not user:
            raise InternalError(detail="Failed to create user")

        user_id = user.id
        created_at = user.created_at

        # Insert app_owner record
        supabase.table("app_owner").insert(
            {
                "id": 1,
                "supabase_user_id": user_id,
                "email": email,
            }
        ).execute()

        # Sign in to get tokens
        sign_in_response = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

        if not sign_in_response.session:
            raise InternalError(detail="Failed to create session")

        session = sign_in_response.session

        # Handle created_at - it may be a string or datetime object
        parsed_created_at = None
        if created_at:
            if isinstance(created_at, str):
                parsed_created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            elif isinstance(created_at, datetime):
                parsed_created_at = created_at

        return AuthTokenResponse(
            user=UserResponse(
                id=user_id,
                email=email,
                created_at=parsed_created_at,
            ),
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    except AuthAlreadyInitializedError:
        raise
    except AuthApiError as e:
        logger.exception("Auth API error during bootstrap")
        raise InternalError(detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected error during bootstrap")
        raise InternalError(detail=str(e)) from e


def login_user(
    supabase: Client,
    email: str,
    password: str,
) -> AuthTokenResponse:
    """Authenticate user and return tokens.

    Args:
        supabase: Supabase client instance.
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
        response = supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

        if not response.session or not response.user:
            raise AuthInvalidCredentialsError

        user = response.user
        session = response.session

        # Verify user is the app owner
        owner_result = (
            supabase.table("app_owner").select("*").eq("supabase_user_id", user.id).execute()
        )

        if not owner_result.data:
            # User exists but is not the owner - this shouldn't happen
            # but we handle it for security
            raise AuthInvalidCredentialsError

        # Handle created_at - it may be a string or datetime object
        parsed_created_at = None
        if user.created_at:
            if isinstance(user.created_at, str):
                parsed_created_at = datetime.fromisoformat(user.created_at.replace("Z", "+00:00"))
            elif isinstance(user.created_at, datetime):
                parsed_created_at = user.created_at

        return AuthTokenResponse(
            user=UserResponse(
                id=user.id,
                email=user.email or email,
                created_at=parsed_created_at,
            ),
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    except AuthInvalidCredentialsError:
        raise
    except AuthApiError as e:
        if "Invalid login credentials" in str(e):
            raise AuthInvalidCredentialsError from e
        logger.exception("Auth API error during login")
        raise InternalError(detail=str(e)) from e
    except Exception as e:
        logger.exception("Unexpected error during login")
        raise InternalError(detail=str(e)) from e


def logout_user(supabase: Client, refresh_token: str) -> None:
    """Invalidate user session.

    Args:
        supabase: Supabase client instance.
        refresh_token: Refresh token to invalidate.
    """
    try:
        # Sign out the user - this invalidates the session
        supabase.auth.sign_out()
    except Exception:
        # Log but don't fail - logout should always succeed from client's perspective
        logger.exception("Error during logout")
