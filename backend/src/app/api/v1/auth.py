"""Authentication API endpoints."""

from fastapi import APIRouter, status

from app.api.dependencies import CurrentOwner, DBSession
from app.schemas.auth import (
    AuthTokenResponse,
    BootstrapRequest,
    BootstrapStatusResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    UserResponse,
)
from app.services.auth import (
    bootstrap_owner,
    check_bootstrap_status,
    login_user,
    logout_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get(
    "/bootstrap/status",
    response_model=BootstrapStatusResponse,
    summary="Check bootstrap status",
    description="Check if the application has been initialized with an owner account.",
)
async def get_bootstrap_status(
    db: DBSession,
) -> BootstrapStatusResponse:
    """Check if the application has been initialized.

    Returns whether an owner account exists. This endpoint is public
    and does not require authentication.

    Args:
        db: Database session.

    Returns:
        Bootstrap status response indicating if initialized.
    """
    initialized = await check_bootstrap_status(db)
    return BootstrapStatusResponse(initialized=initialized)


@router.post(
    "/bootstrap",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize application",
    description="Create the owner account and initialize the application. Only works once.",
    responses={
        409: {
            "description": "Application already initialized",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "AUTH_ALREADY_INITIALIZED",
                            "message": "Application already initialized with owner",
                        }
                    }
                }
            },
        }
    },
)
async def bootstrap(
    request: BootstrapRequest,
    db: DBSession,
) -> AuthTokenResponse:
    """Create the owner account and initialize the application.

    Creates the app_owner record with hashed password and
    returns authentication tokens.

    This endpoint can only be called once. Subsequent calls will
    return HTTP 409.

    Args:
        request: Bootstrap request with email and password.
        db: Database session.

    Returns:
        Authentication tokens and user information.

    Raises:
        AuthAlreadyInitializedError: If app is already initialized.
    """
    return await bootstrap_owner(
        db=db,
        email=request.email,
        password=request.password,
    )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Authenticate user",
    description="Exchange email and password for access and refresh tokens.",
    responses={
        401: {
            "description": "Invalid credentials",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "AUTH_INVALID_CREDENTIALS",
                            "message": "Invalid email or password",
                        }
                    }
                }
            },
        }
    },
)
async def login(
    request: LoginRequest,
    db: DBSession,
) -> AuthTokenResponse:
    """Authenticate user and return tokens.

    Verifies credentials and returns JWT tokens if successful.
    Only the app owner can authenticate.

    Args:
        request: Login request with email and password.
        db: Database session.

    Returns:
        Authentication tokens and user information.

    Raises:
        AuthInvalidCredentialsError: If credentials are invalid.
    """
    return await login_user(
        db=db,
        email=request.email,
        password=request.password,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Logout user",
    description="Invalidate the current refresh token.",
)
async def logout(
    request: LogoutRequest,
    current_user: CurrentOwner,
    db: DBSession,
) -> LogoutResponse:
    """Invalidate the current session.

    With JWT-based auth, logout is handled client-side by discarding tokens.

    Args:
        request: Logout request with refresh token.
        current_user: Current authenticated user (required).
        db: Database session.

    Returns:
        Success message.
    """
    await logout_user(db, request.refresh_token)
    return LogoutResponse(message="Successfully logged out")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about the currently authenticated user.",
    responses={
        401: {
            "description": "Not authenticated",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "AUTH_UNAUTHORIZED",
                            "message": "Authentication required",
                        }
                    }
                }
            },
        },
        403: {
            "description": "Not the app owner",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "AUTH_FORBIDDEN",
                            "message": "You do not have permission to access this resource",
                        }
                    }
                }
            },
        },
    },
)
async def get_current_user_info(
    current_user: CurrentOwner,
) -> UserResponse:
    """Get current authenticated user information.

    Returns information about the currently authenticated user.
    Requires valid JWT token in Authorization header.

    Args:
        current_user: Current authenticated user.

    Returns:
        User information.
    """
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        created_at=current_user.get("created_at"),
    )
