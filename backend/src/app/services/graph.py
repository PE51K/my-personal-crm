"""Graph business logic."""

import logging
import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Contact, ContactAssociation
from app.schemas.graph import (
    EdgeResponse,
    GraphEdge,
    GraphNode,
    GraphResponse,
)
from app.services.storage import get_file_url
from app.utils.errors import (
    ContactNotFoundError,
    GraphEdgeExistsError,
    GraphEdgeNotFoundError,
)

logger = logging.getLogger(__name__)


async def get_graph(db: AsyncSession) -> GraphResponse:
    """Get all contacts and associations for graph visualization.

    Args:
        db: Database session.

    Returns:
        Graph response with nodes and edges.
    """
    # Fetch all contacts
    stmt = select(Contact)
    result = await db.execute(stmt)
    contacts = result.scalars().all()

    # Build nodes
    nodes = []
    for contact in contacts:
        # Generate signed photo URL if photo exists
        photo_url = None
        if contact.photo_path:
            try:
                photo_url = get_file_url(contact.photo_path)
            except Exception:
                logger.warning("Failed to generate signed URL for photo")

        nodes.append(
            GraphNode(
                id=str(contact.id),
                first_name=contact.first_name,
                last_name=contact.last_name,
                photo_url=photo_url,
                position_x=contact.position_x,
                position_y=contact.position_y,
            )
        )

    # Fetch all associations (edges)
    stmt = select(ContactAssociation)
    result = await db.execute(stmt)
    associations = result.scalars().all()

    edges = [
        GraphEdge(
            id=str(edge.id),
            source_id=str(edge.source_contact_id),
            target_id=str(edge.target_contact_id),
            label=edge.label,
        )
        for edge in associations
    ]

    return GraphResponse(nodes=nodes, edges=edges)


async def create_edge(
    db: AsyncSession,
    source_id: str,
    target_id: str,
    label: str | None = None,
) -> EdgeResponse:
    """Create an association between two contacts.

    Args:
        db: Database session.
        source_id: Source contact ID.
        target_id: Target contact ID.
        label: Optional edge label.

    Returns:
        Created edge response.

    Raises:
        ContactNotFoundError: If either contact doesn't exist.
        GraphEdgeExistsError: If edge already exists.
    """
    # Convert string IDs to UUIDs
    try:
        source_uuid = uuid.UUID(source_id)
        target_uuid = uuid.UUID(target_id)
    except ValueError as e:
        raise ContactNotFoundError(source_id) from e

    # Verify both contacts exist
    for contact_id in [source_uuid, target_uuid]:
        stmt = select(Contact).where(Contact.id == contact_id)
        result = await db.execute(stmt)
        contact = result.scalar_one_or_none()
        if not contact:
            raise ContactNotFoundError(str(contact_id))

    # Check if edge already exists (in either direction)
    stmt = select(ContactAssociation).where(
        or_(
            (ContactAssociation.source_contact_id == source_uuid)
            & (ContactAssociation.target_contact_id == target_uuid),
            (ContactAssociation.source_contact_id == target_uuid)
            & (ContactAssociation.target_contact_id == source_uuid),
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        raise GraphEdgeExistsError(source_id, target_id)

    # Create edge
    edge = ContactAssociation(
        source_contact_id=source_uuid,
        target_contact_id=target_uuid,
        label=label,
    )
    db.add(edge)
    await db.flush()  # Flush to get the generated ID and created_at
    await db.refresh(edge)  # Refresh to get server defaults

    return EdgeResponse(
        id=str(edge.id),
        source_id=str(edge.source_contact_id),
        target_id=str(edge.target_contact_id),
        label=edge.label,
        created_at=edge.created_at,
    )


async def delete_edge(db: AsyncSession, edge_id: str) -> None:
    """Delete an association.

    Args:
        db: Database session.
        edge_id: Edge ID to delete.

    Raises:
        GraphEdgeNotFoundError: If edge doesn't exist.
    """
    # Convert string ID to UUID
    try:
        edge_uuid = uuid.UUID(edge_id)
    except ValueError as e:
        raise GraphEdgeNotFoundError(edge_id) from e

    # Check edge exists
    stmt = select(ContactAssociation).where(ContactAssociation.id == edge_uuid)
    result = await db.execute(stmt)
    edge = result.scalar_one_or_none()

    if not edge:
        raise GraphEdgeNotFoundError(edge_id)

    # Delete edge
    await db.delete(edge)
