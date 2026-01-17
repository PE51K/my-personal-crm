"""Contact request and response schemas."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator


class TagBase(BaseModel):
    """Base tag schema.

    Attributes:
        id: Tag unique identifier.
        name: Tag name.
    """

    id: str
    name: str


class TagWithCount(TagBase):
    """Tag with usage count.

    Attributes:
        usage_count: Number of contacts using this tag.
    """

    usage_count: int = 0


class InterestBase(BaseModel):
    """Base interest schema.

    Attributes:
        id: Interest unique identifier.
        name: Interest name.
    """

    id: str
    name: str


class OccupationBase(BaseModel):
    """Base occupation schema.

    Attributes:
        id: Occupation unique identifier.
        name: Occupation name.
    """

    id: str
    name: str


class StatusBase(BaseModel):
    """Base status schema.

    Attributes:
        id: Status unique identifier.
        name: Status name.
    """

    id: str
    name: str


class ContactAssociationBrief(BaseModel):
    """Brief contact info for associations.

    Attributes:
        id: Contact unique identifier.
        first_name: Contact's first name.
        middle_name: Contact's middle name (optional).
        last_name: Contact's last name (optional).
    """

    id: str
    first_name: str
    middle_name: str | None = None
    last_name: str | None = None


class TagInput(BaseModel):
    """Tag input for creating/linking tags.

    Attributes:
        id: Tag ID (can be temp ID like 'temp-123' or real UUID).
        name: Tag name (required for temp IDs).
    """

    id: str
    name: str


class InterestInput(BaseModel):
    """Interest input for creating/linking interests.

    Attributes:
        id: Interest ID (can be temp ID like 'temp-123' or real UUID).
        name: Interest name (required for temp IDs).
    """

    id: str
    name: str


class OccupationInput(BaseModel):
    """Occupation input for creating/linking occupations.

    Attributes:
        id: Occupation ID (can be temp ID like 'temp-123' or real UUID).
        name: Occupation name (required for temp IDs).
    """

    id: str
    name: str


class StatusInput(BaseModel):
    """Status input for creating/linking statuses.

    Attributes:
        id: Status ID (can be temp ID like 'temp-123' or real UUID).
        name: Status name (required for temp IDs).
    """

    id: str
    name: str


class ContactCreateRequest(BaseModel):
    """Request to create a contact.

    Attributes:
        first_name: Contact's first name (required).
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        telegram_username: Telegram username.
        linkedin_url: LinkedIn profile URL.
        github_username: GitHub username.
        met_at: Date when the contact was met.
        status_id: Status ID or StatusInput object for the contact (supports temp IDs).
        notes: Additional notes.
        tag_ids: List of tag IDs or objects to associate (supports temp IDs).
        interest_ids: List of interest IDs or objects to associate (supports temp IDs).
        occupation_ids: List of occupation IDs or objects to associate (supports temp IDs).
        association_contact_ids: List of contact IDs to associate.
    """

    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    telegram_username: str | None = Field(default=None, max_length=100)
    linkedin_url: HttpUrl | None = None
    github_username: str | None = Field(default=None, max_length=100)
    met_at: date | None = None
    status_id: StatusInput | str | None = None
    notes: str | None = None

    @field_validator("status_id", mode="before")
    @classmethod
    def validate_status_id(cls, v: Any) -> Any:
        """Validate status_id - accept string or dict (StatusInput)."""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if isinstance(v, dict):
            # Convert dict to StatusInput
            return StatusInput(**v)
        if isinstance(v, StatusInput):
            # Already a StatusInput instance
            return v
        return v

    tag_ids: list[str | TagInput] = Field(default_factory=list)
    interest_ids: list[str | InterestInput] = Field(default_factory=list)
    occupation_ids: list[str | OccupationInput] = Field(default_factory=list)
    association_contact_ids: list[str] = Field(default_factory=list)


class ContactUpdateRequest(BaseModel):
    """Request to update a contact (all fields optional).

    Attributes:
        first_name: Contact's first name.
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        telegram_username: Telegram username.
        linkedin_url: LinkedIn profile URL.
        github_username: GitHub username.
        met_at: Date when the contact was met.
        status_id: Status ID or StatusInput object for the contact (supports temp IDs).
        notes: Additional notes.
        tag_ids: List of tag IDs or objects to associate (supports temp IDs).
        interest_ids: List of interest IDs or objects to associate (supports temp IDs).
        occupation_ids: List of occupation IDs or objects to associate (supports temp IDs).
        association_contact_ids: List of contact IDs to associate.
    """

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    telegram_username: str | None = Field(default=None, max_length=100)
    linkedin_url: HttpUrl | None = None
    github_username: str | None = Field(default=None, max_length=100)
    met_at: date | None = None
    status_id: StatusInput | str | None = None
    notes: str | None = None
    tag_ids: list[str | TagInput] | None = None

    @field_validator("status_id", mode="before")
    @classmethod
    def validate_status_id(cls, v: Any) -> Any:
        """Validate status_id - accept string or dict (StatusInput)."""
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if isinstance(v, dict):
            # Convert dict to StatusInput
            return StatusInput(**v)
        if isinstance(v, StatusInput):
            # Already a StatusInput instance
            return v
        return v

    interest_ids: list[str | InterestInput] | None = None
    occupation_ids: list[str | OccupationInput] | None = None
    association_contact_ids: list[str] | None = None


class ContactResponse(BaseModel):
    """Full contact response.

    Attributes:
        id: Contact unique identifier.
        first_name: Contact's first name.
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        telegram_username: Telegram username.
        linkedin_url: LinkedIn profile URL.
        github_username: GitHub username.
        met_at: Date when the contact was met.
        status_id: Status ID.
        status: Status details.
        notes: Additional notes.
        photo_path: Path to photo in storage.
        photo_url: Signed URL for photo.
        tags: Associated tags.
        interests: Associated interests.
        occupations: Associated occupations.
        associations: Associated contacts.
        sort_order_in_status: Sort order within status column.
        created_at: When the contact was created.
        updated_at: When the contact was last updated.
    """

    id: str
    first_name: str
    middle_name: str | None = None
    last_name: str | None = None
    telegram_username: str | None = None
    linkedin_url: str | None = None
    github_username: str | None = None
    met_at: date | None = None
    status_id: str | None = None
    status: StatusBase | None = None
    notes: str | None = None
    photo_path: str | None = None
    photo_url: str | None = None
    tags: list[TagBase] = Field(default_factory=list)
    interests: list[InterestBase] = Field(default_factory=list)
    occupations: list[OccupationBase] = Field(default_factory=list)
    associations: list[ContactAssociationBrief] = Field(default_factory=list)
    sort_order_in_status: int = 0
    created_at: datetime
    updated_at: datetime


class ContactListItem(BaseModel):
    """Contact item for list view.

    Attributes:
        id: Contact unique identifier.
        first_name: Contact's first name.
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        status: Status details.
        photo_url: Signed URL for photo.
        tags: Associated tags.
        created_at: When the contact was created.
    """

    id: str
    first_name: str
    middle_name: str | None = None
    last_name: str | None = None
    status: StatusBase | None = None
    photo_url: str | None = None
    tags: list[TagBase] = Field(default_factory=list)
    created_at: datetime


class PaginationMeta(BaseModel):
    """Pagination metadata.

    Attributes:
        page: Current page number.
        page_size: Number of items per page.
        total_items: Total number of items.
        total_pages: Total number of pages.
    """

    page: int
    page_size: int
    total_items: int
    total_pages: int


class ContactListResponse(BaseModel):
    """Paginated contact list response.

    Attributes:
        data: List of contacts.
        pagination: Pagination metadata.
    """

    data: list[ContactListItem]
    pagination: PaginationMeta


class PhotoUploadResponse(BaseModel):
    """Response after photo upload.

    Attributes:
        photo_path: Storage path of the uploaded photo.
        photo_url: Signed URL for accessing the photo.
    """

    photo_path: str
    photo_url: str


class PhotoUrlResponse(BaseModel):
    """Response with signed photo URL.

    Attributes:
        photo_url: Signed URL for accessing the photo.
        expires_at: When the signed URL expires.
    """

    photo_url: str
    expires_at: datetime
