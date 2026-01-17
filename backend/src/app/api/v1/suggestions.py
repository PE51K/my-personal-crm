"""Suggestions API endpoints for autocomplete."""

from fastapi import APIRouter, Query

from app.api.dependencies import CurrentOwner, DBSession
from app.schemas.suggestion import SuggestionItem, SuggestionListResponse

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


@router.get(
    "/tags",
    response_model=SuggestionListResponse,
    summary="Get tag suggestions",
    description="Get tag suggestions for autocomplete.",
)
async def get_tag_suggestions(
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get tag suggestions for autocomplete.

    Returns tags that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching tags with usage counts.
    """
    # Search tags
    result = (
        supabase.table("tags").select("id, name").ilike("name", f"%{q}%").limit(limit).execute()
    )

    suggestions = []
    for tag in result.data:
        # Count usage
        count_result = (
            supabase.table("contact_tags")
            .select("contact_id", count="exact")
            .eq("tag_id", tag["id"])
            .execute()
        )
        usage_count = count_result.count or 0

        suggestions.append(
            SuggestionItem(
                id=tag["id"],
                name=tag["name"],
                usage_count=usage_count,
            )
        )

    # Sort by usage count descending
    suggestions.sort(key=lambda x: x.usage_count, reverse=True)

    return SuggestionListResponse(data=suggestions)


@router.get(
    "/interests",
    response_model=SuggestionListResponse,
    summary="Get interest suggestions",
    description="Get interest suggestions for autocomplete.",
)
async def get_interest_suggestions(
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get interest suggestions for autocomplete.

    Returns interests that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching interests with usage counts.
    """
    # Search interests
    result = (
        supabase.table("interests")
        .select("id, name")
        .ilike("name", f"%{q}%")
        .limit(limit)
        .execute()
    )

    suggestions = []
    for interest in result.data:
        # Count usage
        count_result = (
            supabase.table("contact_interests")
            .select("contact_id", count="exact")
            .eq("interest_id", interest["id"])
            .execute()
        )
        usage_count = count_result.count or 0

        suggestions.append(
            SuggestionItem(
                id=interest["id"],
                name=interest["name"],
                usage_count=usage_count,
            )
        )

    # Sort by usage count descending
    suggestions.sort(key=lambda x: x.usage_count, reverse=True)

    return SuggestionListResponse(data=suggestions)


@router.get(
    "/occupations",
    response_model=SuggestionListResponse,
    summary="Get occupation suggestions",
    description="Get occupation suggestions for autocomplete.",
)
async def get_occupation_suggestions(
    current_user: CurrentOwner,
    supabase: SupabaseClient,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get occupation suggestions for autocomplete.

    Returns occupations that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        supabase: Supabase client instance.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching occupations with usage counts.
    """
    # Search occupations
    result = (
        supabase.table("occupations")
        .select("id, name")
        .ilike("name", f"%{q}%")
        .limit(limit)
        .execute()
    )

    suggestions = []
    for occupation in result.data:
        # Count usage
        count_result = (
            supabase.table("contact_occupations")
            .select("contact_id", count="exact")
            .eq("occupation_id", occupation["id"])
            .execute()
        )
        usage_count = count_result.count or 0

        suggestions.append(
            SuggestionItem(
                id=occupation["id"],
                name=occupation["name"],
                usage_count=usage_count,
            )
        )

    # Sort by usage count descending
    suggestions.sort(key=lambda x: x.usage_count, reverse=True)

    return SuggestionListResponse(data=suggestions)
