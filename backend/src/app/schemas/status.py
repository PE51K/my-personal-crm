"""Status request and response schemas."""

from pydantic import BaseModel, Field


class StatusCreateRequest(BaseModel):
    """Request to create a status.

    Attributes:
        name: Status name.
        is_active: Whether the status is active.
    """

    name: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class StatusUpdateRequest(BaseModel):
    """Request to update a status.

    Attributes:
        name: Status name (optional).
        is_active: Whether the status is active (optional).
    """

    name: str | None = Field(default=None, min_length=1, max_length=50)
    is_active: bool | None = None


class StatusReorderRequest(BaseModel):
    """Request to reorder statuses.

    Attributes:
        order: List of status IDs in desired order.
    """

    order: list[str]


class StatusResponse(BaseModel):
    """Status response.

    Attributes:
        id: Status unique identifier.
        name: Status name.
        sort_order: Sort order for display.
        is_active: Whether the status is active.
        contact_count: Number of contacts with this status.
    """

    id: str
    name: str
    sort_order: int
    is_active: bool
    contact_count: int = 0


class StatusListResponse(BaseModel):
    """Status list response.

    Attributes:
        data: List of statuses.
    """

    data: list[StatusResponse]


class StatusReorderResponse(BaseModel):
    """Status reorder response.

    Attributes:
        message: Success message.
    """

    message: str
