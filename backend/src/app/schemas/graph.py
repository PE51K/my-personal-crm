"""Graph request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """Node in the graph (contact).

    Attributes:
        id: Contact unique identifier.
        first_name: Contact's first name.
        last_name: Contact's last name.
        photo_url: Signed URL for contact's photo.
        position_x: X position in graph visualization.
        position_y: Y position in graph visualization.
    """

    id: str
    first_name: str
    last_name: str | None = None
    photo_url: str | None = None
    position_x: float | None = None
    position_y: float | None = None


class GraphEdge(BaseModel):
    """Edge in the graph (association).

    Attributes:
        id: Edge unique identifier.
        source_id: Source contact ID.
        target_id: Target contact ID.
        label: Optional edge label.
    """

    id: str
    source_id: str
    target_id: str
    label: str | None = None


class GraphResponse(BaseModel):
    """Full graph response.

    Attributes:
        nodes: List of graph nodes (contacts).
        edges: List of graph edges (associations).
    """

    nodes: list[GraphNode]
    edges: list[GraphEdge]


class EdgeCreateRequest(BaseModel):
    """Request to create an edge.

    Attributes:
        source_id: Source contact ID.
        target_id: Target contact ID.
        label: Optional edge label.
    """

    source_id: str
    target_id: str
    label: str | None = Field(default=None, max_length=100)


class EdgeResponse(BaseModel):
    """Edge response.

    Attributes:
        id: Edge unique identifier.
        source_id: Source contact ID.
        target_id: Target contact ID.
        label: Optional edge label.
        created_at: When the edge was created.
    """

    id: str
    source_id: str
    target_id: str
    label: str | None = None
    created_at: datetime
