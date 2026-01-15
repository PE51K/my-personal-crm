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
        cluster_id: Cluster ID for grouping.
        position_x: X position in graph visualization.
        position_y: Y position in graph visualization.
    """

    id: str
    first_name: str
    last_name: str | None = None
    photo_url: str | None = None
    cluster_id: int | None = None
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


class GraphCluster(BaseModel):
    """Cluster information.

    Attributes:
        id: Cluster ID.
        contact_count: Number of contacts in this cluster.
        color: Color for visualization.
    """

    id: int
    contact_count: int
    color: str


class GraphResponse(BaseModel):
    """Full graph response.

    Attributes:
        nodes: List of graph nodes (contacts).
        edges: List of graph edges (associations).
        clusters: List of cluster information.
    """

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    clusters: list[GraphCluster]


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


class ClusterRecomputeResponse(BaseModel):
    """Response after cluster recomputation.

    Attributes:
        clusters_found: Number of clusters found.
        contacts_updated: Number of contacts updated.
        algorithm: Algorithm used for clustering.
    """

    clusters_found: int
    contacts_updated: int
    algorithm: str = "connected_components"
