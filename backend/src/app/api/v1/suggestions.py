"""Suggestions API endpoints for autocomplete."""

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.dependencies import CurrentOwner, DBSession
from app.models import (
    Interest,
    Occupation,
    Tag,
    contact_interests,
    contact_occupations,
    contact_tags,
)
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
    db: DBSession,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get tag suggestions for autocomplete.

    Returns tags that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        db: Database session.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching tags with usage counts.
    """
    # Search tags with usage count
    query = (
        select(Tag.id, Tag.name, func.count(contact_tags.c.contact_id).label("usage_count"))
        .outerjoin(contact_tags, Tag.id == contact_tags.c.tag_id)
        .where(Tag.name.ilike(f"%{q}%"))
        .group_by(Tag.id, Tag.name)
        .order_by(func.count(contact_tags.c.contact_id).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    suggestions = [
        SuggestionItem(
            id=str(row.id),
            name=row.name,
            usage_count=row.usage_count,
        )
        for row in rows
    ]

    return SuggestionListResponse(data=suggestions)


@router.get(
    "/interests",
    response_model=SuggestionListResponse,
    summary="Get interest suggestions",
    description="Get interest suggestions for autocomplete.",
)
async def get_interest_suggestions(
    current_user: CurrentOwner,
    db: DBSession,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get interest suggestions for autocomplete.

    Returns interests that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        db: Database session.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching interests with usage counts.
    """
    # Search interests with usage count
    query = (
        select(
            Interest.id,
            Interest.name,
            func.count(contact_interests.c.contact_id).label("usage_count"),
        )
        .outerjoin(contact_interests, Interest.id == contact_interests.c.interest_id)
        .where(Interest.name.ilike(f"%{q}%"))
        .group_by(Interest.id, Interest.name)
        .order_by(func.count(contact_interests.c.contact_id).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    suggestions = [
        SuggestionItem(
            id=str(row.id),
            name=row.name,
            usage_count=row.usage_count,
        )
        for row in rows
    ]

    return SuggestionListResponse(data=suggestions)


@router.get(
    "/occupations",
    response_model=SuggestionListResponse,
    summary="Get occupation suggestions",
    description="Get occupation suggestions for autocomplete.",
)
async def get_occupation_suggestions(
    current_user: CurrentOwner,
    db: DBSession,
    q: str = Query(min_length=1, description="Search query"),
    limit: int = Query(default=10, ge=1, le=50, description="Max results"),
) -> SuggestionListResponse:
    """Get occupation suggestions for autocomplete.

    Returns occupations that match the query, ordered by usage count.

    Args:
        current_user: Current authenticated owner.
        db: Database session.
        q: Search query (minimum 1 character).
        limit: Maximum number of results.

    Returns:
        List of matching occupations with usage counts.
    """
    # Search occupations with usage count
    query = (
        select(
            Occupation.id,
            Occupation.name,
            func.count(contact_occupations.c.contact_id).label("usage_count"),
        )
        .outerjoin(contact_occupations, Occupation.id == contact_occupations.c.occupation_id)
        .where(Occupation.name.ilike(f"%{q}%"))
        .group_by(Occupation.id, Occupation.name)
        .order_by(func.count(contact_occupations.c.contact_id).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    suggestions = [
        SuggestionItem(
            id=str(row.id),
            name=row.name,
            usage_count=row.usage_count,
        )
        for row in rows
    ]

    return SuggestionListResponse(data=suggestions)
