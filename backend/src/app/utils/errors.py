"""Standardized API error handling."""

from typing import Any

from fastapi import HTTPException, status


class APIError(HTTPException):
    """Standardized API error with consistent format.

    All API errors follow a consistent format:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": {}
        }
    }
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Initialize API error.

        Args:
            status_code: HTTP status code.
            code: Machine-readable error code.
            message: Human-readable error message.
            details: Additional error details.
        """
        self.code = code
        self.error_message = message
        self.error_details = details or {}
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "details": details or {},
                }
            },
        )


# Authentication Errors
class AuthAlreadyInitializedError(APIError):
    """Raised when bootstrap is attempted on initialized app."""

    def __init__(self) -> None:
        """Initialize auth already initialized error."""
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="AUTH_ALREADY_INITIALIZED",
            message="Application has already been initialized with an owner account",
        )


class AuthInvalidCredentialsError(APIError):
    """Raised when credentials are invalid."""

    def __init__(self) -> None:
        """Initialize invalid credentials error."""
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_INVALID_CREDENTIALS",
            message="Invalid email or password",
        )


class AuthTokenExpiredError(APIError):
    """Raised when JWT has expired."""

    def __init__(self) -> None:
        """Initialize token expired error."""
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_TOKEN_EXPIRED",
            message="Token has expired",
        )


class AuthTokenInvalidError(APIError):
    """Raised when JWT is malformed or invalid."""

    def __init__(self, detail: str | None = None) -> None:
        """Initialize token invalid error.

        Args:
            detail: Additional detail about the error.
        """
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_TOKEN_INVALID",
            message="Token is malformed or invalid",
            details={"detail": detail} if detail else None,
        )


class AuthUnauthorizedError(APIError):
    """Raised when no authentication is provided."""

    def __init__(self) -> None:
        """Initialize unauthorized error."""
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTH_UNAUTHORIZED",
            message="Authentication required",
        )


class AuthForbiddenError(APIError):
    """Raised when user is not the app owner."""

    def __init__(self) -> None:
        """Initialize forbidden error."""
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code="AUTH_FORBIDDEN",
            message="You do not have permission to access this resource",
        )


# Resource Errors
class ContactNotFoundError(APIError):
    """Raised when contact is not found."""

    def __init__(self, contact_id: str | None = None) -> None:
        """Initialize contact not found error.

        Args:
            contact_id: ID of the contact that was not found.
        """
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="CONTACT_NOT_FOUND",
            message="Contact with the specified ID was not found",
            details={"contact_id": contact_id} if contact_id else None,
        )


class StatusNotFoundError(APIError):
    """Raised when status is not found."""

    def __init__(self, status_id: str | None = None) -> None:
        """Initialize status not found error.

        Args:
            status_id: ID of the status that was not found.
        """
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="STATUS_NOT_FOUND",
            message="Status with the specified ID was not found",
            details={"status_id": status_id} if status_id else None,
        )


class GraphEdgeExistsError(APIError):
    """Raised when graph edge already exists."""

    def __init__(self, source_id: str | None = None, target_id: str | None = None) -> None:
        """Initialize graph edge exists error.

        Args:
            source_id: Source contact ID.
            target_id: Target contact ID.
        """
        details = {}
        if source_id:
            details["source_id"] = source_id
        if target_id:
            details["target_id"] = target_id

        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code="GRAPH_EDGE_EXISTS",
            message="An association between these contacts already exists",
            details=details if details else None,
        )


class GraphEdgeNotFoundError(APIError):
    """Raised when graph edge is not found."""

    def __init__(self, edge_id: str | None = None) -> None:
        """Initialize graph edge not found error.

        Args:
            edge_id: ID of the edge that was not found.
        """
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="GRAPH_EDGE_NOT_FOUND",
            message="Edge with the specified ID was not found",
            details={"edge_id": edge_id} if edge_id else None,
        )


# File Errors
class FileTooLargeError(APIError):
    """Raised when uploaded file exceeds size limit."""

    def __init__(self, max_size_mb: int = 5) -> None:
        """Initialize file too large error.

        Args:
            max_size_mb: Maximum allowed file size in MB.
        """
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            code="FILE_TOO_LARGE",
            message=f"File size exceeds the maximum allowed size of {max_size_mb}MB",
            details={"max_size_mb": max_size_mb},
        )


class FileTypeInvalidError(APIError):
    """Raised when file type is not supported."""

    def __init__(self, allowed_types: list[str] | None = None) -> None:
        """Initialize file type invalid error.

        Args:
            allowed_types: List of allowed MIME types.
        """
        allowed = allowed_types or ["image/jpeg", "image/png", "image/webp"]
        super().__init__(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            code="FILE_TYPE_INVALID",
            message="File type is not supported",
            details={"allowed_types": allowed},
        )


class PhotoNotFoundError(APIError):
    """Raised when contact has no photo."""

    def __init__(self, contact_id: str | None = None) -> None:
        """Initialize photo not found error.

        Args:
            contact_id: ID of the contact.
        """
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="PHOTO_NOT_FOUND",
            message="Contact does not have a photo",
            details={"contact_id": contact_id} if contact_id else None,
        )


# Validation Error
class ValidationError(APIError):
    """Raised when request validation fails."""

    def __init__(self, details: dict[str, str]) -> None:
        """Initialize validation error.

        Args:
            details: Field-specific validation errors.
        """
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=details,
        )


# Internal Error
class InternalError(APIError):
    """Raised for unexpected server errors."""

    def __init__(self, detail: str | None = None) -> None:
        """Initialize internal error.

        Args:
            detail: Additional error detail (only shown in debug mode).
        """
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred",
            details={"detail": detail} if detail else None,
        )
