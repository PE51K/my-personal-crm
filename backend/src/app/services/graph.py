"""Graph business logic."""

import logging

from supabase import Client

from app.core.errors import (
    ContactNotFoundError,
    GraphEdgeExistsError,
    GraphEdgeNotFoundError,
)
from app.schemas.graph import (
    EdgeResponse,
    GraphEdge,
    GraphNode,
    GraphResponse,
)
from app.services.supabase import get_signed_photo_url

logger = logging.getLogger(__name__)


def get_graph(supabase: Client) -> GraphResponse:
    """Get all contacts and associations for graph visualization.

    Args:
        supabase: Supabase client instance.

    Returns:
        Graph response with nodes and edges.
    """
    # Fetch all contacts
    contacts_result = (
        supabase.table("contacts")
        .select("id, first_name, last_name, photo_path, position_x, position_y")
        .execute()
    )

    # Build nodes
    nodes = []
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
                position_x=contact.get("position_x"),
                position_y=contact.get("position_y"),
            )
        )

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

    return GraphResponse(nodes=nodes, edges=edges)


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
