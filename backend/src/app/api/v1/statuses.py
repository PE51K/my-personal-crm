"""Statuses API endpoints."""

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentOwner, DBSession
from app.utils.errors import StatusNotFoundError
from app.schemas.status import (
    StatusCreateRequest,
    StatusListResponse,
    StatusReorderRequest,
    StatusReorderResponse,
    StatusResponse,
    StatusUpdateRequest,
)

router = APIRouter(prefix="/statuses", tags=["Statuses"])


@router.get(
    "",
    response_model=StatusListResponse,
    summary="List statuses",
    description="Get all statuses ordered by sort_order.",
)
async def list_statuses(
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    include_inactive: bool = Query(default=False, description="Include inactive statuses"),
) -> StatusListResponse:
    """List all statuses.

    Returns all statuses ordered by sort_order. By default, only
    active statuses are returned.

    Args:
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        include_inactive: Whether to include inactive statuses.

    Returns:
        List of statuses with contact counts.
    """
    query = supabase.table("statuses").select("*").order("sort_order")

    if not include_inactive:
        query = query.eq("is_active", True)

    result = query.execute()

    # Get contact counts for each status
    statuses = []
    for status_data in result.data:
        count_result = (
            supabase.table("contacts")
            .select("id", count="exact")
            .eq("status_id", status_data["id"])
            .execute()
        )
        contact_count = count_result.count or 0

        statuses.append(
            StatusResponse(
                id=status_data["id"],
                name=status_data["name"],
                sort_order=status_data["sort_order"],
                is_active=status_data["is_active"],
                contact_count=contact_count,
            )
        )

    return StatusListResponse(data=statuses)


@router.post(
    "",
    response_model=StatusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create status",
    description="Create a new status.",
)
async def create_status(
    request: StatusCreateRequest,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> StatusResponse:
    """Create a new status.

    Creates a status with the given name. The sort_order is
    automatically set to be after existing statuses.

    Args:
        request: Status creation request.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Created status.
    """
    # Get max sort_order
    max_order_result = (
        supabase.table("statuses")
        .select("sort_order")
        .order("sort_order", desc=True)
        .limit(1)
        .execute()
    )

    max_order = max_order_result.data[0]["sort_order"] if max_order_result.data else 0
    new_order = max_order + 1

    # Create status
    result = (
        supabase.table("statuses")
        .insert(
            {
                "name": request.name,
                "sort_order": new_order,
                "is_active": request.is_active,
            }
        )
        .execute()
    )

    status_data = result.data[0]
    return StatusResponse(
        id=status_data["id"],
        name=status_data["name"],
        sort_order=status_data["sort_order"],
        is_active=status_data["is_active"],
        contact_count=0,
    )


@router.patch(
    "/{status_id}",
    response_model=StatusResponse,
    summary="Update status",
    description="Update a status.",
    responses={
        404: {
            "description": "Status not found",
        }
    },
)
async def update_status(
    status_id: str,
    request: StatusUpdateRequest,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> StatusResponse:
    """Update a status.

    Updates the status name and/or is_active flag.

    Args:
        status_id: Status ID to update.
        request: Status update request.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Updated status.

    Raises:
        StatusNotFoundError: If status doesn't exist.
    """
    # Check status exists
    existing = supabase.table("statuses").select("*").eq("id", status_id).execute()
    if not existing.data:
        raise StatusNotFoundError(status_id)

    # Build update data
    update_data = {}
    if request.name is not None:
        update_data["name"] = request.name
    if request.is_active is not None:
        update_data["is_active"] = request.is_active

    if update_data:
        supabase.table("statuses").update(update_data).eq("id", status_id).execute()

    # Get updated status
    result = supabase.table("statuses").select("*").eq("id", status_id).execute()
    status_data = result.data[0]

    # Get contact count
    count_result = (
        supabase.table("contacts").select("id", count="exact").eq("status_id", status_id).execute()
    )
    contact_count = count_result.count or 0

    return StatusResponse(
        id=status_data["id"],
        name=status_data["name"],
        sort_order=status_data["sort_order"],
        is_active=status_data["is_active"],
        contact_count=contact_count,
    )


@router.post(
    "/reorder",
    response_model=StatusReorderResponse,
    summary="Reorder statuses",
    description="Update the sort order of all statuses.",
)
async def reorder_statuses(
    request: StatusReorderRequest,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> StatusReorderResponse:
    """Reorder statuses.

    Updates the sort_order for all statuses based on the provided
    order list.

    Args:
        request: Status reorder request with ordered IDs.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Returns:
        Success message.
    """
    # Update sort_order for each status
    for index, status_id in enumerate(request.order):
        supabase.table("statuses").update({"sort_order": index + 1}).eq("id", status_id).execute()

    return StatusReorderResponse(message="Statuses reordered successfully")


@router.delete(
    "/{status_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete status",
    description="Delete a status (only if not in use by any contacts).",
    responses={
        404: {
            "description": "Status not found",
        },
        409: {
            "description": "Status is in use and cannot be deleted",
        },
    },
)
async def delete_status(
    status_id: str,
    current_user: CurrentOwner,
    supabase: SupabaseClient,
) -> None:
    """Delete a status.

    Deletes the status only if it's not assigned to any contacts.
    If contacts are using this status, returns a 409 Conflict error.

    Args:
        status_id: Status ID to delete.
        current_user: Current authenticated owner.
        supabase: Supabase client instance.

    Raises:
        StatusNotFoundError: If status doesn't exist.
        HTTPException: If status is in use by contacts.
    """
    from fastapi import HTTPException

    # Check status exists
    existing = supabase.table("statuses").select("*").eq("id", status_id).execute()
    if not existing.data:
        raise StatusNotFoundError(status_id)

    # Check if status is in use
    count_result = (
        supabase.table("contacts").select("id", count="exact").eq("status_id", status_id).execute()
    )
    contact_count = count_result.count or 0

    if contact_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete status: {contact_count} contact(s) are using it",
        )

    # Delete status
    supabase.table("statuses").delete().eq("id", status_id).execute()
