"""Contacts API endpoints."""

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, File, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.api.dependencies import CurrentOwner, DBSession
from app.utils.errors import PhotoNotFoundError
from app.services.storage import (
    delete_file,
    file_exists,
    get_file_url,
    save_uploaded_file,
)
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

router = APIRouter(prefix="/contacts", tags=["Contacts"])


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
    db: DBSession,
) -> ContactResponse:
    """Create a new contact.

    Creates a contact with the provided information and associates
    tags, interests, occupations, and other contacts as specified.

    Args:
        request: Contact creation request.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Created contact with all related data.
    """
    return await create_contact(
        db=db,
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
    db: DBSession,
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
        db: Database session.
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

    return await list_contacts(
        db=db,
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
    db: DBSession,
) -> ContactResponse:
    """Get a single contact by ID.

    Returns the full contact information including all associated
    tags, interests, occupations, and associations.

    Args:
        contact_id: Contact ID to fetch.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    return await get_contact(db, contact_id)


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
    db: DBSession,
) -> ContactResponse:
    """Update a contact (partial update).

    Only updates the fields that are provided in the request.
    Associated tags, interests, occupations, and associations
    are replaced if provided.

    Args:
        contact_id: Contact ID to update.
        request: Contact update request.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Updated contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        StatusNotFoundError: If status_id is invalid.
    """
    return await update_contact(
        db=db,
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
    db: DBSession,
) -> None:
    """Delete a contact.

    Removes the contact and all associated relationships.
    This action cannot be undone.

    Args:
        contact_id: Contact ID to delete.
        current_user: Current authenticated owner.
        db: Database session.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    await delete_contact(db, contact_id)


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
    db: DBSession,
    photo: UploadFile = File(..., description="Photo file"),
) -> PhotoUploadResponse:
    """Upload a contact photo.

    Uploads the photo to MinIO Storage and updates the contact's
    photo_path. Replaces any existing photo.

    Constraints:
    - Max file size: 5MB
    - Allowed types: image/jpeg, image/png, image/webp

    Args:
        contact_id: Contact ID to upload photo for.
        current_user: Current authenticated owner.
        db: Database session.
        photo: Photo file to upload.

    Returns:
        Photo upload response with path and signed URL.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        FileTooLargeError: If file exceeds size limit.
        FileTypeInvalidError: If file type is not allowed.
    """
    # Verify contact exists
    contact = await get_contact(db, contact_id)

    # Delete old photo if exists
    if contact.photo_path:
        try:
            delete_file(contact.photo_path)
        except Exception:
            # Ignore deletion errors (file might not exist)
            pass

    # Upload new photo (includes validation)
    photo_path = await save_uploaded_file(photo)

    # Update contact with new photo path
    await update_contact(db, contact_id, photo_path=photo_path)

    # Generate signed URL (1 hour expiration)
    photo_url = get_file_url(photo_path, expires_seconds=3600)

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
    db: DBSession,
) -> PhotoUrlResponse:
    """Get a signed URL for the contact's photo.

    Generates a short-lived signed URL (1 hour) for accessing
    the contact's photo.

    Args:
        contact_id: Contact ID to get photo URL for.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Photo URL response with signed URL and expiration.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        PhotoNotFoundError: If contact has no photo.
    """
    contact = await get_contact(db, contact_id)

    if not contact.photo_path:
        raise PhotoNotFoundError(contact_id)

    # Generate signed URL with 1 hour expiration
    expires_seconds = 3600
    photo_url = get_file_url(contact.photo_path, expires_seconds=expires_seconds)

    # Calculate expiration timestamp
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_seconds)

    return PhotoUrlResponse(photo_url=photo_url, expires_at=expires_at)
