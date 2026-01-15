"""Supabase client wrapper and utilities."""

from datetime import UTC, datetime, timedelta

from supabase import Client

from app.core.config import get_settings


def get_signed_photo_url(
    supabase: Client,
    photo_path: str,
    expires_in_minutes: int = 5,
) -> tuple[str, datetime]:
    """Generate a signed URL for a photo in Supabase storage.

    Args:
        supabase: Supabase client instance.
        photo_path: Path to the photo in storage.
        expires_in_minutes: URL expiration time in minutes.

    Returns:
        Tuple of (signed_url, expires_at datetime).
    """
    settings = get_settings()
    bucket = settings.supabase_storage_bucket

    # Create signed URL
    response = supabase.storage.from_(bucket).create_signed_url(
        photo_path,
        expires_in_minutes * 60,  # Convert to seconds
    )

    expires_at = datetime.now(UTC) + timedelta(minutes=expires_in_minutes)
    return response["signedURL"], expires_at


def upload_photo(
    supabase: Client,
    contact_id: str,
    file_content: bytes,
    content_type: str,
    filename: str,
) -> str:
    """Upload a photo to Supabase storage.

    Args:
        supabase: Supabase client instance.
        contact_id: Contact ID for organizing the photo.
        file_content: Raw file content.
        content_type: MIME type of the file.
        filename: Original filename.

    Returns:
        Storage path of the uploaded photo.
    """
    settings = get_settings()
    bucket = settings.supabase_storage_bucket

    # Generate storage path
    extension = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    photo_path = f"contacts/{contact_id}/photo.{extension}"

    # Upload with upsert to replace existing photo
    supabase.storage.from_(bucket).upload(
        photo_path,
        file_content,
        {"content-type": content_type, "upsert": "true"},
    )

    return photo_path


def delete_photo(supabase: Client, photo_path: str) -> None:
    """Delete a photo from Supabase storage.

    Args:
        supabase: Supabase client instance.
        photo_path: Path to the photo in storage.
    """
    settings = get_settings()
    bucket = settings.supabase_storage_bucket

    supabase.storage.from_(bucket).remove([photo_path])
