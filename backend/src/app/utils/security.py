"""Security utilities for JWT creation/verification and password hashing."""

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.settings import get_settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenPayload(BaseModel):
    """JWT token payload schema.

    Attributes:
        sub: Subject (user ID).
        exp: Expiration timestamp.
        iat: Issued at timestamp.
        email: User email (optional).
        type: Token type (access or refresh).
    """

    sub: str
    exp: int | None = None
    iat: int | None = None
    email: str | None = None
    type: str = "access"  # access or refresh


class JWTError(Exception):
    """Base exception for JWT-related errors."""

    def __init__(self, message: str, code: str) -> None:
        """Initialize JWT error.

        Args:
            message: Human-readable error message.
            code: Error code for API response.
        """
        self.message = message
        self.code = code
        super().__init__(message)


class TokenExpiredError(JWTError):
    """Exception raised when token has expired."""

    def __init__(self) -> None:
        """Initialize token expired error."""
        super().__init__(
            message="Token has expired",
            code="AUTH_TOKEN_EXPIRED",
        )


class TokenInvalidError(JWTError):
    """Exception raised when token is invalid."""

    def __init__(self, detail: str = "Token is invalid") -> None:
        """Initialize token invalid error.

        Args:
            detail: Specific detail about why token is invalid.
        """
        super().__init__(
            message=detail,
            code="AUTH_TOKEN_INVALID",
        )


# =============================================================================
# Password Hashing Functions
# =============================================================================


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.

    Args:
        password: Plain text password to hash.

    Returns:
        Hashed password string.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash.

    Args:
        plain_password: Plain text password to verify.
        hashed_password: Hashed password to compare against.

    Returns:
        True if password matches, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


# =============================================================================
# JWT Token Functions
# =============================================================================


def create_access_token(user_id: str, email: str) -> str:
    """Create an access token for a user.

    Args:
        user_id: User ID to encode in token.
        email: User email to encode in token.

    Returns:
        Encoded JWT access token.
    """
    settings = get_settings()
    now = datetime.now(UTC)
    expires_delta = timedelta(minutes=settings.security.access_token_expire_minutes)
    expire = now + expires_delta

    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(
        payload, settings.security.jwt_secret_key, algorithm=settings.security.jwt_algorithm
    )


def create_refresh_token(user_id: str, email: str) -> str:
    """Create a refresh token for a user.

    Args:
        user_id: User ID to encode in token.
        email: User email to encode in token.

    Returns:
        Encoded JWT refresh token.
    """
    settings = get_settings()
    now = datetime.now(UTC)
    expires_delta = timedelta(days=settings.security.refresh_token_expire_days)
    expire = now + expires_delta

    payload = {
        "sub": user_id,
        "email": email,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(
        payload, settings.security.jwt_secret_key, algorithm=settings.security.jwt_algorithm
    )


def verify_jwt_token(token: str, expected_type: str = "access") -> TokenPayload:
    """Verify and decode a JWT token.

    Args:
        token: JWT token string to verify.
        expected_type: Expected token type (access or refresh).

    Returns:
        TokenPayload with decoded claims.

    Raises:
        TokenExpiredError: If the token has expired.
        TokenInvalidError: If the token is malformed or signature is invalid.
    """
    settings = get_settings()

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.security.jwt_secret_key,
            algorithms=[settings.security.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenExpiredError from e
    except jwt.JWTError as e:
        raise TokenInvalidError(detail=str(e)) from e

    # Validate required claims
    sub = payload.get("sub")
    if not sub:
        raise TokenInvalidError(detail="Token missing 'sub' claim")

    # Validate token type
    token_type = payload.get("type", "access")
    if token_type != expected_type:
        raise TokenInvalidError(
            detail=f"Invalid token type. Expected {expected_type}, got {token_type}"
        )

    return TokenPayload(
        sub=sub,
        exp=payload.get("exp"),
        iat=payload.get("iat"),
        email=payload.get("email"),
        type=token_type,
    )


def is_token_expired(payload: TokenPayload) -> bool:
    """Check if a token payload indicates an expired token.

    Args:
        payload: Decoded token payload.

    Returns:
        True if token is expired, False otherwise.
    """
    if payload.exp is None:
        return False

    now = datetime.now(UTC).timestamp()
    return now > payload.exp


def extract_bearer_token(authorization: str | None) -> str | None:
    """Extract bearer token from Authorization header.

    Args:
        authorization: Full Authorization header value.

    Returns:
        Token string if valid bearer token, None otherwise.
    """
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2:  # noqa: PLR2004
        return None

    scheme, token = parts
    if scheme.lower() != "bearer":
        return None

    return token
