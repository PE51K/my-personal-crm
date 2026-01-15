"""Contacts API endpoints."""

from datetime import date

from fastapi import APIRouter, File, Query, UploadFile, status

from app.core.deps import CurrentOwner, SupabaseClient
from app.core.errors import FileTooLargeError, FileTypeInvalidError, PhotoNotFoundError
from app.schemas.contact import (
    ContactCreateRequest,
    ContactListResponse,
    ContactResponse,
    ContactUpdateRequest,
    PhotoUploadResponse,
    PhotoUrlResponse,
)
from app.services.contacts import (
    create_contact,
    delete_contact,
    get_contact,
    list_contacts,
    update_contact,
)
from app.services.supabase import get_signed_photo_url, upload_photo

router = APIRouter(prefix="/contacts", tags=["Contacts"])

# Constants for file upload
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create contact",
    description="Create a new contact with all specified fields.",
)
async def create_contact_endpoint(
    request: ContactCreateRequest,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> ContactResponse:
    """Create a new contact.

    Creates a contact with the provided information and associates
    tags, interests, occupations, and other contacts as specified.

    Args:
        request: Contact creation request.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Created contact with all related data.
    """
    return create_contact(
        supabase=supabase,
        first_name=request.first_name,
        middle_name=request.middle_name,
        last_name=request.last_name,
        telegram_username=request.telegram_username,
        linkedin_url=str(request.linkedin_url) if request.linkedin_url else None,
        github_username=request.github_username,
        met_at=request.met_at,
        status_id=request.status_id,
        notes=request.notes,
        tag_ids=request.tag_ids,
        interest_ids=request.interest_ids,
        occupation_ids=request.occupation_ids,
        association_contact_ids=request.association_contact_ids,
    )


@router.get(
    "",
    response_model=ContactListResponse,
    summary="List contacts",
    description="Get paginated list of contacts with optional filtering.",
)
async def list_contacts_endpoint(
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status_id: str | None = Query(default=None, description="Filter by status ID"),
    tag_ids: str | None = Query(default=None, description="Filter by tag IDs (comma-separated)"),
    interest_ids: str | None = Query(
        default=None, description="Filter by interest IDs (comma-separated)"
    ),
    occupation_ids: str | None = Query(
        default=None, description="Filter by occupation IDs (comma-separated)"
    ),
    created_at_from: date | None = Query(
        default=None, description="Filter by creation date (from)"
    ),
    created_at_to: date | None = Query(default=None, description="Filter by creation date (to)"),
    met_at_from: date | None = Query(default=None, description="Filter by met date (from)"),
    met_at_to: date | None = Query(default=None, description="Filter by met date (to)"),
    search: str | None = Query(default=None, description="Search in names"),
    sort_by: str = Query(default="created_at", description="Sort field"),
    sort_order: str = Query(default="desc", description="Sort order (asc/desc)"),
) -> ContactListResponse:
    """List contacts with filtering and pagination.

    Returns a paginated list of contacts. Supports filtering by various
    criteria including status, tags, interests, occupations, and dates.

    Args:
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        status_id: Filter by status ID.
        tag_ids: Filter by tag IDs (comma-separated).
        interest_ids: Filter by interest IDs (comma-separated).
        occupation_ids: Filter by occupation IDs (comma-separated).
        created_at_from: Filter by creation date (from).
        created_at_to: Filter by creation date (to).
        met_at_from: Filter by met date (from).
        met_at_to: Filter by met date (to).
        search: Search in names.
        sort_by: Field to sort by.
        sort_order: Sort order (asc/desc).

    Returns:
        Paginated list of contacts.
    """
    # Parse comma-separated IDs
    parsed_tag_ids = tag_ids.split(",") if tag_ids else None
    parsed_interest_ids = interest_ids.split(",") if interest_ids else None
    parsed_occupation_ids = occupation_ids.split(",") if occupation_ids else None

    return list_contacts(
        supabase=supabase,
        page=page,
        page_size=page_size,
        status_id=status_id,
        tag_ids=parsed_tag_ids,
        interest_ids=parsed_interest_ids,
        occupation_ids=parsed_occupation_ids,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
        met_at_from=met_at_from,
        met_at_to=met_at_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Get contact",
    description="Get a single contact by ID.",
    responses={
        404: {
            "description": "Contact not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "CONTACT_NOT_FOUND",
                            "message": "Contact with the specified ID was not found",
                        }
                    }
                }
            },
        }
    },
)
async def get_contact_endpoint(
    contact_id: str,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> ContactResponse:
    """Get a single contact by ID.

    Returns the full contact information including all associated
    tags, interests, occupations, and associations.

    Args:
        contact_id: Contact ID to fetch.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    return get_contact(supabase, contact_id)


@router.patch(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Update contact",
    description="Update a contact (partial update).",
    responses={
        404: {
            "description": "Contact not found",
        }
    },
)
async def update_contact_endpoint(
    contact_id: str,
    request: ContactUpdateRequest,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> ContactResponse:
    """Update a contact (partial update).

    Only updates the fields that are provided in the request.
    Associated tags, interests, occupations, and associations
    are replaced if provided.

    Args:
        contact_id: Contact ID to update.
        request: Contact update request.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Updated contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        StatusNotFoundError: If status_id is invalid.
    """
    return update_contact(
        supabase=supabase,
        contact_id=contact_id,
        first_name=request.first_name,
        middle_name=request.middle_name,
        last_name=request.last_name,
        telegram_username=request.telegram_username,
        linkedin_url=str(request.linkedin_url) if request.linkedin_url else None,
        github_username=request.github_username,
        met_at=request.met_at,
        status_id=request.status_id,
        notes=request.notes,
        tag_ids=request.tag_ids,
        interest_ids=request.interest_ids,
        occupation_ids=request.occupation_ids,
        association_contact_ids=request.association_contact_ids,
    )


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact",
    description="Delete a contact by ID.",
    responses={
        404: {
            "description": "Contact not found",
        }
    },
)
async def delete_contact_endpoint(
    contact_id: str,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> None:
    """Delete a contact.

    Removes the contact and all associated relationships.
    This action cannot be undone.

    Args:
        contact_id: Contact ID to delete.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    delete_contact(supabase, contact_id)


@router.post(
    "/{contact_id}/photo",
    response_model=PhotoUploadResponse,
    summary="Upload photo",
    description="Upload a contact photo.",
    responses={
        413: {
            "description": "File too large",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "FILE_TOO_LARGE",
                            "message": "File size exceeds the maximum allowed size of 5MB",
                        }
                    }
                }
            },
        },
        415: {
            "description": "Invalid file type",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "FILE_TYPE_INVALID",
                            "message": "File type is not supported",
                        }
                    }
                }
            },
        },
    },
)
async def upload_photo_endpoint(
    contact_id: str,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    photo: UploadFile = File(..., description="Photo file"),
) -> PhotoUploadResponse:
    """Upload a contact photo.

    Uploads the photo to Supabase Storage and updates the contact's
    photo_path. Replaces any existing photo.

    Constraints:
    - Max file size: 5MB
    - Allowed types: image/jpeg, image/png, image/webp

    Args:
        contact_id: Contact ID to upload photo for.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        photo: Photo file to upload.

    Returns:
        Photo upload response with path and signed URL.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        FileTooLargeError: If file exceeds size limit.
        FileTypeInvalidError: If file type is not allowed.
    """
    # Verify contact exists
    get_contact(supabase, contact_id)

    # Validate content type
    if photo.content_type not in ALLOWED_CONTENT_TYPES:
        raise FileTypeInvalidError(list(ALLOWED_CONTENT_TYPES))

    # Read file content
    content = await photo.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise FileTooLargeError(max_size_mb=5)

    # Upload photo
    photo_path = upload_photo(
        supabase=supabase,
        contact_id=contact_id,
        file_content=content,
        content_type=photo.content_type,
        filename=photo.filename or "photo.jpg",
    )

    # Update contact with photo path
    supabase.table("contacts").update({"photo_path": photo_path}).eq("id", contact_id).execute()

    # Generate signed URL
    photo_url, _ = get_signed_photo_url(supabase, photo_path)

    return PhotoUploadResponse(photo_path=photo_path, photo_url=photo_url)


@router.get(
    "/{contact_id}/photo-url",
    response_model=PhotoUrlResponse,
    summary="Get photo URL",
    description="Get a signed URL for the contact's photo.",
    responses={
        404: {
            "description": "Contact or photo not found",
        }
    },
)
async def get_photo_url_endpoint(
    contact_id: str,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> PhotoUrlResponse:
    """Get a signed URL for the contact's photo.

    Generates a short-lived signed URL (5 minutes) for accessing
    the contact's photo.

    Args:
        contact_id: Contact ID to get photo URL for.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Photo URL response with signed URL and expiration.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        PhotoNotFoundError: If contact has no photo.
    """
    contact = get_contact(supabase, contact_id)

    if not contact.photo_path:
        raise PhotoNotFoundError(contact_id)

    photo_url, expires_at = get_signed_photo_url(supabase, contact.photo_path)

    return PhotoUrlResponse(photo_url=photo_url, expires_at=expires_at)
