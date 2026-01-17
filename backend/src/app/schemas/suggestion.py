"""Suggestion schemas for autocomplete."""

from pydantic import BaseModel


class SuggestionItem(BaseModel):
    """Single suggestion item.

    Attributes:
        id: Item unique identifier.
        name: Item name.
        usage_count: Number of times this item is used.
        occupation_id: Occupation ID (for positions only, optional).
    """

    id: str
    name: str
    usage_count: int = 0
    occupation_id: str | None = None


class SuggestionListResponse(BaseModel):
    """Suggestion list response.

    Attributes:
        data: List of suggestion items.
    """

    data: list[SuggestionItem]
