"""Kanban API endpoints."""

from fastapi import APIRouter

from app.core.deps import CurrentOwner, SupabaseClient
from app.core.errors import ContactNotFoundError, StatusNotFoundError
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
    supabase: SupabaseClient,
) -> KanbanMoveResponse:
    """Move a contact to a different status and/or position.

    Updates the contact's status_id and sort_order_in_status atomically.
    Also updates the sort_order_in_status of other contacts in the
    target status to make room for the moved contact.

    Args:
        request: Kanban move request.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Updated contact position information.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        StatusNotFoundError: If status doesn't exist.
    """
    # Verify contact exists
    contact_result = (
        supabase.table("contacts")
        .select("id, status_id, sort_order_in_status")
        .eq("id", request.contact_id)
        .execute()
    )
    if not contact_result.data:
        raise ContactNotFoundError(request.contact_id)

    # Verify status exists
    status_result = supabase.table("statuses").select("id").eq("id", request.status_id).execute()
    if not status_result.data:
        raise StatusNotFoundError(request.status_id)

    old_status_id = contact_result.data[0]["status_id"]
    old_position = contact_result.data[0]["sort_order_in_status"]
    new_position = request.position

    # If moving within the same status
    if old_status_id == request.status_id:
        if old_position < new_position:
            # Moving down - shift contacts between old and new position up
            supabase.table("contacts").update(
                {"sort_order_in_status": supabase.raw("sort_order_in_status - 1")}
            ).eq("status_id", request.status_id).gt("sort_order_in_status", old_position).lte(
                "sort_order_in_status", new_position
            ).execute()
        elif old_position > new_position:
            # Moving up - shift contacts between new and old position down
            supabase.table("contacts").update(
                {"sort_order_in_status": supabase.raw("sort_order_in_status + 1")}
            ).eq("status_id", request.status_id).gte("sort_order_in_status", new_position).lt(
                "sort_order_in_status", old_position
            ).execute()
    else:
        # Moving to a different status

        # Shift contacts in old status up to fill the gap
        if old_status_id:
            supabase.table("contacts").update(
                {"sort_order_in_status": supabase.raw("sort_order_in_status - 1")}
            ).eq("status_id", old_status_id).gt("sort_order_in_status", old_position).execute()

        # Shift contacts in new status down to make room
        supabase.table("contacts").update(
            {"sort_order_in_status": supabase.raw("sort_order_in_status + 1")}
        ).eq("status_id", request.status_id).gte("sort_order_in_status", new_position).execute()

    # Update the moved contact
    supabase.table("contacts").update(
        {
            "status_id": request.status_id,
            "sort_order_in_status": new_position,
        }
    ).eq("id", request.contact_id).execute()

    return KanbanMoveResponse(
        id=request.contact_id,
        status_id=request.status_id,
        sort_order_in_status=new_position,
    )
