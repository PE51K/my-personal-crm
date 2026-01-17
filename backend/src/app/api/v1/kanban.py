"""Kanban API endpoints."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentOwner, DBSession
from app.models.contact import Contact
from app.models.status import Status
from app.utils.errors import ContactNotFoundError, StatusNotFoundError
from app.schemas.kanban import KanbanMoveRequest, KanbanMoveResponse

router = APIRouter(prefix="/kanban", tags=["Kanban"])


@router.post(
    "/move",
    response_model=KanbanMoveResponse,
    summary="Move contact in Kanban",
    description="Move a contact to a different status and/or position.",
    responses={
        404: {
            "description": "Contact or status not found",
        }
    },
)
async def move_contact(
    request: KanbanMoveRequest,
    current_user: CurrentOwner,
    db: DBSession,
) -> KanbanMoveResponse:
    """Move a contact to a different status and/or position.

    Updates the contact's status_id and sort_order_in_status atomically.
    Also updates the sort_order_in_status of other contacts in the
    target status to make room for the moved contact.

    Args:
        request: Kanban move request.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Updated contact position information.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        StatusNotFoundError: If status doesn't exist.
    """
    # Verify contact exists
    contact_result = await db.execute(
        select(Contact).where(Contact.id == UUID(request.contact_id))
    )
    contact = contact_result.scalar_one_or_none()
    if not contact:
        raise ContactNotFoundError(request.contact_id)

    # Verify status exists
    status_result = await db.execute(
        select(Status).where(Status.id == UUID(request.status_id))
    )
    if not status_result.scalar_one_or_none():
        raise StatusNotFoundError(request.status_id)

    old_status_id = str(contact.status_id) if contact.status_id else None
    old_position = contact.sort_order_in_status or 0
    new_position = request.position

    # If moving within the same status
    if old_status_id == request.status_id:
        if old_position < new_position:
            # Moving down - shift contacts between old and new position up
            await db.execute(
                update(Contact)
                .where(
                    Contact.status_id == UUID(request.status_id),
                    Contact.sort_order_in_status > old_position,
                    Contact.sort_order_in_status <= new_position,
                )
                .values(sort_order_in_status=Contact.sort_order_in_status - 1)
            )
        elif old_position > new_position:
            # Moving up - shift contacts between new and old position down
            await db.execute(
                update(Contact)
                .where(
                    Contact.status_id == UUID(request.status_id),
                    Contact.sort_order_in_status >= new_position,
                    Contact.sort_order_in_status < old_position,
                )
                .values(sort_order_in_status=Contact.sort_order_in_status + 1)
            )
    else:
        # Moving to a different status

        # Shift contacts in old status up to fill the gap
        if old_status_id:
            await db.execute(
                update(Contact)
                .where(
                    Contact.status_id == UUID(old_status_id),
                    Contact.sort_order_in_status > old_position,
                )
                .values(sort_order_in_status=Contact.sort_order_in_status - 1)
            )

        # Shift contacts in new status down to make room
        await db.execute(
            update(Contact)
            .where(
                Contact.status_id == UUID(request.status_id),
                Contact.sort_order_in_status >= new_position,
            )
            .values(sort_order_in_status=Contact.sort_order_in_status + 1)
        )

    # Update the moved contact
    contact.status_id = UUID(request.status_id)
    contact.sort_order_in_status = new_position
    await db.commit()
    await db.refresh(contact)

    return KanbanMoveResponse(
        id=request.contact_id,
        status_id=request.status_id,
        sort_order_in_status=new_position,
    )
