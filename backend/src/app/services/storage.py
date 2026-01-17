"""MinIO object storage utilities for contact photos."""

import io
import uuid
from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from typing import BinaryIO

from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.settings import get_settings
from app.utils.errors import FileTooLargeError, FileTypeInvalidError, InternalError, PhotoNotFoundError

# Allowed image MIME types
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@lru_cache
def get_minio_client() -> Minio:
    """Get cached MinIO client instance.

    Returns:
        MinIO client configured with settings.
    """
    settings = get_settings()
    s3_settings = settings.s3

    # Parse endpoint to get host and determine if secure
    endpoint_url = s3_settings.endpoint_url
    # Remove protocol if present
    if "://" in endpoint_url:
        protocol, endpoint = endpoint_url.split("://", 1)
        secure = protocol == "https"
    else:
        endpoint = endpoint_url
        secure = False

    return Minio(
        endpoint=endpoint,
        access_key=s3_settings.access_key_id,
        secret_key=s3_settings.secret_access_key,
        secure=secure,
    )


def ensure_bucket_exists() -> None:
    """Ensure that the MinIO bucket exists, create if it doesn't.

    Raises:
        InternalError: If bucket creation fails.
    """
    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except S3Error as e:
        raise InternalError(f"Failed to ensure bucket exists: {e}") from e


def validate_file_size(file: UploadFile) -> None:
    """Validate that file size is within limits.

    Args:
        file: Uploaded file to validate.

    Raises:
        FileTooLargeError: If file size exceeds maximum.
    """
    # Default max size of 5MB (can be made configurable later)
    max_size_mb = 5
    max_size_bytes = max_size_mb * 1024 * 1024

    # Get file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Seek back to start

    if file_size > max_size_bytes:
        raise FileTooLargeError(max_size_mb)


def validate_file_type(file: UploadFile) -> None:
    """Validate that file type is allowed.

    Args:
        file: Uploaded file to validate.

    Raises:
        FileTypeInvalidError: If file type is not allowed.
    """
    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise FileTypeInvalidError(list(ALLOWED_MIME_TYPES))

    # Check extension
    if file.filename:
        extension = Path(file.filename).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise FileTypeInvalidError(list(ALLOWED_MIME_TYPES))


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving extension.

    Args:
        original_filename: Original filename from upload.

    Returns:
        Unique filename with UUID prefix.
    """
    extension = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex
    return f"{unique_id}{extension}"


async def save_uploaded_file(file: UploadFile, filename: str | None = None) -> str:
    """Save an uploaded file to MinIO storage.

    Args:
        file: Uploaded file to save.
        filename: Optional custom filename. If not provided, generates unique filename.

    Returns:
        Object name (path) where file was saved in MinIO.

    Raises:
        FileTooLargeError: If file is too large.
        FileTypeInvalidError: If file type is not allowed.
        InternalError: If there's an error saving the file.
    """
    # Validate file
    validate_file_size(file)
    validate_file_type(file)

    # Generate filename if not provided
    if filename is None and file.filename:
        filename = generate_unique_filename(file.filename)
    elif filename is None:
        filename = f"{uuid.uuid4().hex}.jpg"

    # Ensure bucket exists
    ensure_bucket_exists()

    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        # Get file size for MinIO upload
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        # Upload to MinIO
        client.put_object(
            bucket_name=bucket_name,
            object_name=filename,
            data=file.file,
            length=file_size,
            content_type=file.content_type or "application/octet-stream",
        )
    except S3Error as e:
        raise InternalError(f"Failed to save file: {e}") from e
    except Exception as e:
        raise InternalError(f"Failed to save file: {e}") from e
    finally:
        await file.close()

    return filename


def delete_file(file_path: str) -> None:
    """Delete a file from MinIO storage.

    Args:
        file_path: Object name (path) of file to delete.

    Raises:
        InternalError: If there's an error deleting the file.
    """
    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        # Delete file from MinIO
        client.remove_object(bucket_name, file_path)
    except S3Error as e:
        raise InternalError(f"Failed to delete file: {e}") from e
    except Exception as e:
        raise InternalError(f"Failed to delete file: {e}") from e


def get_file_url(object_name: str, expires_seconds: int = 3600) -> str:
    """Get a presigned URL for accessing a file.

    Args:
        object_name: Object name (path) of the file.
        expires_seconds: Number of seconds until URL expires (default: 1 hour).

    Returns:
        Presigned URL for accessing the file.

    Raises:
        PhotoNotFoundError: If file doesn't exist.
        InternalError: If URL generation fails.
    """
    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        # Generate presigned URL (MinIO expects timedelta, not int)
        url = client.presigned_get_object(
            bucket_name=bucket_name,
            object_name=object_name,
            expires=timedelta(seconds=expires_seconds),
        )
        return url
    except S3Error as e:
        raise PhotoNotFoundError() from e
    except Exception as e:
        raise InternalError(f"Failed to generate file URL: {e}") from e


def file_exists(object_name: str) -> bool:
    """Check if a file exists in MinIO storage.

    Args:
        object_name: Object name (path) of the file.

    Returns:
        True if file exists, False otherwise.
    """
    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        # Try to get object metadata
        client.stat_object(bucket_name, object_name)
        return True
    except S3Error:
        return False
    except Exception:
        return False


def get_file_stream(object_name: str) -> BinaryIO:
    """Get a file stream from MinIO storage.

    Args:
        object_name: Object name (path) of the file.

    Returns:
        Binary stream of the file content.

    Raises:
        PhotoNotFoundError: If file doesn't exist.
        InternalError: If retrieval fails.
    """
    try:
        settings = get_settings()
        bucket_name = settings.s3.bucket_name
        client = get_minio_client()

        # Get object from MinIO
        response = client.get_object(bucket_name, object_name)

        # Read the response into a BytesIO object
        file_data = response.read()
        response.close()
        response.release_conn()

        return io.BytesIO(file_data)
    except S3Error as e:
        raise PhotoNotFoundError() from e
    except Exception as e:
        raise InternalError(f"Failed to retrieve file: {e}") from e
