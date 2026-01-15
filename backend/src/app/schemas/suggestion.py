"""Suggestion schemas for autocomplete."""

from pydantic import BaseModel


class SuggestionItem(BaseModel):
    """Single suggestion item.

    Attributes:
        id: Item unique identifier.
        name: Item name.
        usage_count: Number of times this item is used.
    """

    id: str
    name: str
    usage_count: int = 0


class SuggestionListResponse(BaseModel):
    """Suggestion list response.

    Attributes:
        data: List of suggestion items.
    """

    data: list[SuggestionItem]
