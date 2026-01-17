"""Graph business logic."""

import logging
import uuid
from datetime import date
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Contact, ContactAssociation, ContactOccupation, Interest, Occupation, Position, Tag
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


async def get_graph(
    db: AsyncSession,
    status_id: str | None = None,
    status_ids: list[str] | None = None,
    tag_ids: list[str] | None = None,
    interest_ids: list[str] | None = None,
    occupation_ids: list[str] | None = None,
    position_ids: list[str] | None = None,
    met_at_from: date | None = None,
    met_at_to: date | None = None,
    search: str | None = None,
) -> GraphResponse:
    """Get contacts and associations for graph visualization with optional filtering.

    Args:
        db: Database session.
        status_id: Filter by status ID (single).
        status_ids: Filter by status IDs (multiple, any match).
        tag_ids: Filter by tag IDs (any match).
        interest_ids: Filter by interest IDs (any match).
        occupation_ids: Filter by occupation IDs (any match).
        position_ids: Filter by position IDs (any match).
        met_at_from: Filter by met date (from).
        met_at_to: Filter by met date (to).
        search: Search in first, middle, last name.

    Returns:
        Graph response with nodes and edges.
    """
    # Build base query
    query = select(Contact)

    # Apply filters (similar to list_contacts)
    if status_id:
        query = query.where(Contact.status_id == UUID(status_id))
    elif status_ids:
        status_uuid_ids = [UUID(sid) for sid in status_ids]
        query = query.where(Contact.status_id.in_(status_uuid_ids))

    if met_at_from:
        query = query.where(Contact.met_at >= met_at_from)

    if met_at_to:
        query = query.where(Contact.met_at <= met_at_to)

    if search:
        search_words = search.strip().lower().split()
        or_conditions = []
        for word in search_words:
            pattern = f"%{word}%"
            or_conditions.extend(
                [
                    Contact.first_name.ilike(pattern),
                    Contact.middle_name.ilike(pattern),
                    Contact.last_name.ilike(pattern),
                ]
            )
        query = query.where(or_(*or_conditions))

    # Get contact IDs filtered by tags/interests/occupations/positions
    contact_ids_to_filter: set[UUID] | None = None

    if tag_ids:
        tag_uuid_ids = [UUID(tid) for tid in tag_ids]
        tag_result = await db.execute(
            select(Contact.id)
            .join(Contact.tags)
            .where(Tag.id.in_(tag_uuid_ids))
            .group_by(Contact.id)
        )
        tag_contact_ids = {row[0] for row in tag_result}
        contact_ids_to_filter = (
            tag_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & tag_contact_ids
        )

    if interest_ids:
        interest_uuid_ids = [UUID(iid) for iid in interest_ids]
        interest_result = await db.execute(
            select(Contact.id)
            .join(Contact.interests)
            .where(Interest.id.in_(interest_uuid_ids))
            .group_by(Contact.id)
        )
        interest_contact_ids = {row[0] for row in interest_result}
        contact_ids_to_filter = (
            interest_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & interest_contact_ids
        )

    if occupation_ids:
        occupation_uuid_ids = [UUID(oid) for oid in occupation_ids]
        occupation_result = await db.execute(
            select(Contact.id)
            .join(Contact.contact_occupations)
            .where(ContactOccupation.occupation_id.in_(occupation_uuid_ids))
            .group_by(Contact.id)
        )
        occupation_contact_ids = {row[0] for row in occupation_result}
        contact_ids_to_filter = (
            occupation_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & occupation_contact_ids
        )

    if position_ids:
        position_uuid_ids = [UUID(pid) for pid in position_ids]
        position_result = await db.execute(
            select(Contact.id)
            .join(Contact.contact_occupations)
            .join(ContactOccupation.positions)
            .where(Position.id.in_(position_uuid_ids))
            .group_by(Contact.id)
        )
        position_contact_ids = {row[0] for row in position_result}
        contact_ids_to_filter = (
            position_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & position_contact_ids
        )

    if contact_ids_to_filter is not None:
        if not contact_ids_to_filter:
            # No contacts match the filters
            return GraphResponse(nodes=[], edges=[])
        query = query.where(Contact.id.in_(contact_ids_to_filter))

    # Execute query
    result = await db.execute(query)
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

    # Fetch associations (edges) only for filtered contacts
    contact_id_set = {contact.id for contact in contacts}
    if contact_id_set:
        stmt = select(ContactAssociation).where(
            or_(
                ContactAssociation.source_contact_id.in_(contact_id_set),
                ContactAssociation.target_contact_id.in_(contact_id_set),
            )
        )
        result = await db.execute(stmt)
        associations = result.scalars().all()

        # Only include edges where both source and target are in filtered contacts
        edges = [
            GraphEdge(
                id=str(edge.id),
                source_id=str(edge.source_contact_id),
                target_id=str(edge.target_contact_id),
                label=edge.label,
            )
            for edge in associations
            if edge.source_contact_id in contact_id_set and edge.target_contact_id in contact_id_set
        ]
    else:
        edges = []

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
