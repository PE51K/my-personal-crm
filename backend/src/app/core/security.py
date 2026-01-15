"""Security utilities for JWT verification and authentication."""

from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

import requests
from jose import jwt
from pydantic import BaseModel

from app.core.config import get_settings


class TokenPayload(BaseModel):
    """JWT token payload schema.

    Attributes:
        sub: Subject (user ID).
        exp: Expiration timestamp.
        iat: Issued at timestamp.
        email: User email (optional).
        role: User role (optional).
    """

    sub: str
    exp: int | None = None
    iat: int | None = None
    email: str | None = None
    role: str | None = None


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


@lru_cache(maxsize=1)
def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS from Supabase.

    Uses LRU cache to fetch JWKS only once at startup.
    The cache is cleared on application restart.

    Returns:
        JWKS dictionary containing public keys.

    Raises:
        TokenInvalidError: If JWKS endpoint is unreachable.
    """
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"

    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        raise TokenInvalidError(detail=f"Failed to fetch JWKS: {e}") from e


def verify_jwt_token(token: str) -> TokenPayload:
    """Verify and decode a Supabase JWT token using JWKS.

    Validates the token signature using asymmetric keys from Supabase JWKS endpoint.
    Supports both RS256 (RSA) and ES256 (ECC) signing algorithms.
    This is more secure than symmetric HS256 as the private key never leaves Supabase.

    Args:
        token: JWT token string to verify.

    Returns:
        TokenPayload with decoded claims.

    Raises:
        TokenExpiredError: If the token has expired.
        TokenInvalidError: If the token is malformed or signature is invalid.
    """
    settings = get_settings()
    jwks = get_jwks()

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            jwks,
            algorithms=["RS256", "ES256"],  # Support both RSA and ECC
            audience="authenticated",
            issuer=f"{settings.supabase_url}/auth/v1",
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenExpiredError from e
    except jwt.JWTError as e:
        raise TokenInvalidError(detail=str(e)) from e

    # Validate required claims
    sub = payload.get("sub")
    if not sub:
        raise TokenInvalidError(detail="Token missing 'sub' claim")

    return TokenPayload(
        sub=sub,
        exp=payload.get("exp"),
        iat=payload.get("iat"),
        email=payload.get("email"),
        role=payload.get("role"),
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
