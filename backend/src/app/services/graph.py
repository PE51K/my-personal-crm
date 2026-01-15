"""Graph and clustering business logic."""

import logging
from collections import defaultdict

from supabase import Client

from app.core.errors import (
    ContactNotFoundError,
    GraphEdgeExistsError,
    GraphEdgeNotFoundError,
)
from app.schemas.graph import (
    ClusterRecomputeResponse,
    EdgeResponse,
    GraphCluster,
    GraphEdge,
    GraphNode,
    GraphResponse,
)
from app.services.supabase import get_signed_photo_url

logger = logging.getLogger(__name__)

# Predefined colors for clusters
CLUSTER_COLORS = [
    "#3B82F6",  # Blue
    "#EF4444",  # Red
    "#10B981",  # Green
    "#F59E0B",  # Amber
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#06B6D4",  # Cyan
    "#84CC16",  # Lime
    "#F97316",  # Orange
    "#6366F1",  # Indigo
]


def get_graph(supabase: Client) -> GraphResponse:
    """Get all contacts and associations for graph visualization.

    Args:
        supabase: Supabase client instance.

    Returns:
        Graph response with nodes, edges, and clusters.
    """
    # Fetch all contacts
    contacts_result = (
        supabase.table("contacts")
        .select("id, first_name, last_name, photo_path, cluster_id, position_x, position_y")
        .execute()
    )

    # Build nodes
    nodes = []
    cluster_counts: dict[int, int] = defaultdict(int)

    for contact in contacts_result.data:
        # Generate signed photo URL if photo exists
        photo_url = None
        if contact.get("photo_path"):
            try:
                photo_url, _ = get_signed_photo_url(supabase, contact["photo_path"])
            except Exception:
                logger.warning("Failed to generate signed URL for photo")

        nodes.append(
            GraphNode(
                id=contact["id"],
                first_name=contact["first_name"],
                last_name=contact.get("last_name"),
                photo_url=photo_url,
                cluster_id=contact.get("cluster_id"),
                position_x=contact.get("position_x"),
                position_y=contact.get("position_y"),
            )
        )

        # Count cluster members
        if contact.get("cluster_id") is not None:
            cluster_counts[contact["cluster_id"]] += 1

    # Fetch all associations (edges)
    edges_result = (
        supabase.table("contact_associations")
        .select("id, source_contact_id, target_contact_id, label")
        .execute()
    )

    edges = [
        GraphEdge(
            id=edge["id"],
            source_id=edge["source_contact_id"],
            target_id=edge["target_contact_id"],
            label=edge.get("label"),
        )
        for edge in edges_result.data
    ]

    # Build cluster info
    clusters = [
        GraphCluster(
            id=cluster_id,
            contact_count=count,
            color=CLUSTER_COLORS[cluster_id % len(CLUSTER_COLORS)],
        )
        for cluster_id, count in sorted(cluster_counts.items())
    ]

    return GraphResponse(nodes=nodes, edges=edges, clusters=clusters)


def create_edge(
    supabase: Client,
    source_id: str,
    target_id: str,
    label: str | None = None,
) -> EdgeResponse:
    """Create an association between two contacts.

    Args:
        supabase: Supabase client instance.
        source_id: Source contact ID.
        target_id: Target contact ID.
        label: Optional edge label.

    Returns:
        Created edge response.

    Raises:
        ContactNotFoundError: If either contact doesn't exist.
        GraphEdgeExistsError: If edge already exists.
    """
    # Verify both contacts exist
    for contact_id in [source_id, target_id]:
        result = supabase.table("contacts").select("id").eq("id", contact_id).execute()
        if not result.data:
            raise ContactNotFoundError(contact_id)

    # Check if edge already exists (in either direction)
    existing = (
        supabase.table("contact_associations")
        .select("id")
        .or_(
            f"and(source_contact_id.eq.{source_id},target_contact_id.eq.{target_id}),"
            f"and(source_contact_id.eq.{target_id},target_contact_id.eq.{source_id})"
        )
        .execute()
    )

    if existing.data:
        raise GraphEdgeExistsError(source_id, target_id)

    # Create edge
    result = (
        supabase.table("contact_associations")
        .insert(
            {
                "source_contact_id": source_id,
                "target_contact_id": target_id,
                "label": label,
            }
        )
        .execute()
    )

    edge = result.data[0]
    return EdgeResponse(
        id=edge["id"],
        source_id=edge["source_contact_id"],
        target_id=edge["target_contact_id"],
        label=edge.get("label"),
        created_at=edge["created_at"],
    )


def delete_edge(supabase: Client, edge_id: str) -> None:
    """Delete an association.

    Args:
        supabase: Supabase client instance.
        edge_id: Edge ID to delete.

    Raises:
        GraphEdgeNotFoundError: If edge doesn't exist.
    """
    # Check edge exists
    existing = supabase.table("contact_associations").select("id").eq("id", edge_id).execute()
    if not existing.data:
        raise GraphEdgeNotFoundError(edge_id)

    # Delete edge
    supabase.table("contact_associations").delete().eq("id", edge_id).execute()


def recompute_clusters(supabase: Client) -> ClusterRecomputeResponse:
    """Recompute clusters using connected components algorithm.

    Uses Union-Find algorithm to find connected components in the
    contact association graph.

    Args:
        supabase: Supabase client instance.

    Returns:
        Cluster recomputation response with statistics.
    """
    # Fetch all contacts
    contacts_result = supabase.table("contacts").select("id").execute()
    contact_ids = [c["id"] for c in contacts_result.data]

    if not contact_ids:
        return ClusterRecomputeResponse(
            clusters_found=0,
            contacts_updated=0,
            algorithm="connected_components",
        )

    # Fetch all edges
    edges_result = (
        supabase.table("contact_associations")
        .select("source_contact_id, target_contact_id")
        .execute()
    )

    # Build Union-Find structure
    parent: dict[str, str] = {cid: cid for cid in contact_ids}
    rank: dict[str, int] = dict.fromkeys(contact_ids, 0)

    def find(x: str) -> str:
        """Find root with path compression."""
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x: str, y: str) -> None:
        """Union by rank."""
        px, py = find(x), find(y)
        if px == py:
            return
        if rank[px] < rank[py]:
            px, py = py, px
        parent[py] = px
        if rank[px] == rank[py]:
            rank[px] += 1

    # Process edges
    for edge in edges_result.data:
        source = edge["source_contact_id"]
        target = edge["target_contact_id"]
        if source in parent and target in parent:
            union(source, target)

    # Assign cluster IDs
    root_to_cluster: dict[str, int] = {}
    next_cluster_id = 0

    contact_clusters: dict[str, int] = {}
    for contact_id in contact_ids:
        root = find(contact_id)
        if root not in root_to_cluster:
            root_to_cluster[root] = next_cluster_id
            next_cluster_id += 1
        contact_clusters[contact_id] = root_to_cluster[root]

    # Update contacts with cluster IDs
    contacts_updated = 0
    for contact_id, cluster_id in contact_clusters.items():
        supabase.table("contacts").update({"cluster_id": cluster_id}).eq("id", contact_id).execute()
        contacts_updated += 1

    return ClusterRecomputeResponse(
        clusters_found=next_cluster_id,
        contacts_updated=contacts_updated,
        algorithm="connected_components",
    )
