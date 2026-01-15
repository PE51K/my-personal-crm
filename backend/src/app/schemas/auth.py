"""Authentication request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class BootstrapStatusResponse(BaseModel):
    """Response for bootstrap status check.

    Attributes:
        initialized: Whether the app has been initialized with an owner.
    """

    initialized: bool


class BootstrapRequest(BaseModel):
    """Request to create the owner account.

    Attributes:
        email: Valid email address for the owner.
        password: Password (minimum 8 characters).
    """

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Request to authenticate.

    Attributes:
        email: User email address.
        password: User password.
    """

    email: EmailStr
    password: str


class LogoutRequest(BaseModel):
    """Request to logout.

    Attributes:
        refresh_token: The refresh token to invalidate.
    """

    refresh_token: str


class UserResponse(BaseModel):
    """User information response.

    Attributes:
        id: User's unique identifier.
        email: User's email address.
        created_at: When the user was created.
    """

    id: str
    email: str
    created_at: datetime | None = None


class AuthTokenResponse(BaseModel):
    """Authentication token response.

    Attributes:
        user: User information.
        access_token: JWT access token.
        refresh_token: JWT refresh token.
        token_type: Token type (always "bearer").
        expires_in: Token expiration time in seconds.
    """

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    """Logout response.

    Attributes:
        message: Success message.
    """

    message: str
