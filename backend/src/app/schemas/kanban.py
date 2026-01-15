"""Kanban request and response schemas."""

from pydantic import BaseModel, Field


class KanbanMoveRequest(BaseModel):
    """Request to move a contact in Kanban.

    Attributes:
        contact_id: ID of the contact to move.
        status_id: Target status ID.
        position: Target position within the status column.
    """

    contact_id: str
    status_id: str
    position: int = Field(ge=0)


class KanbanMoveResponse(BaseModel):
    """Response after moving a contact.

    Attributes:
        id: Contact ID.
        status_id: New status ID.
        sort_order_in_status: New position within the status.
    """

    id: str
    status_id: str
    sort_order_in_status: int
