"""Contact business logic using SQLAlchemy."""

import logging
import math
from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import delete as sql_delete
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.utils.errors import ContactNotFoundError, StatusNotFoundError
from app.services.storage import get_file_url
from app.models import (
    Contact,
    ContactAssociation,
    Interest,
    Occupation,
    Status,
    Tag,
)
from app.schemas.contact import (
    ContactAssociationBrief,
    ContactListItem,
    ContactListResponse,
    ContactResponse,
    InterestBase,
    InterestInput,
    OccupationBase,
    OccupationInput,
    PaginationMeta,
    StatusBase,
    StatusInput,
    TagBase,
    TagInput,
)

logger = logging.getLogger(__name__)


def _is_temp_id(id_str: str) -> bool:
    """Check if an ID is a temporary ID."""
    return id_str.startswith("temp-")


async def _process_tags(
    db: AsyncSession,
    tag_inputs: list[str | TagInput] | None,
) -> list[UUID]:
    """Process tag inputs and return list of valid tag UUIDs.

    Creates new tags for temp IDs and returns real UUIDs.

    Args:
        db: Database session instance.
        tag_inputs: List of tag IDs or tag input objects.

    Returns:
        List of valid tag UUIDs.
    """
    if not tag_inputs:
        return []

    tag_ids = []
    for tag_input in tag_inputs:
        if isinstance(tag_input, str):
            # String ID - check if temp or real
            if _is_temp_id(tag_input):
                logger.warning("Received temp tag ID without name: %s", tag_input)
                continue
            tag_ids.append(UUID(tag_input))
        else:
            # TagInput object
            if _is_temp_id(tag_input.id):
                # Create new tag
                new_tag = Tag(name=tag_input.name)
                db.add(new_tag)
                await db.flush()
                tag_ids.append(new_tag.id)
            else:
                # Use existing tag ID
                tag_ids.append(UUID(tag_input.id))

    return tag_ids


async def _process_interests(
    db: AsyncSession,
    interest_inputs: list[str | InterestInput] | None,
) -> list[UUID]:
    """Process interest inputs and return list of valid interest UUIDs.

    Creates new interests for temp IDs and returns real UUIDs.

    Args:
        db: Database session instance.
        interest_inputs: List of interest IDs or interest input objects.

    Returns:
        List of valid interest UUIDs.
    """
    if not interest_inputs:
        return []

    interest_ids = []
    for interest_input in interest_inputs:
        if isinstance(interest_input, str):
            # String ID - check if temp or real
            if _is_temp_id(interest_input):
                logger.warning("Received temp interest ID without name: %s", interest_input)
                continue
            interest_ids.append(UUID(interest_input))
        else:
            # InterestInput object
            if _is_temp_id(interest_input.id):
                # Create new interest
                new_interest = Interest(name=interest_input.name)
                db.add(new_interest)
                await db.flush()
                interest_ids.append(new_interest.id)
            else:
                # Use existing interest ID
                interest_ids.append(UUID(interest_input.id))

    return interest_ids


async def _process_occupations(
    db: AsyncSession,
    occupation_inputs: list[str | OccupationInput] | None,
) -> list[UUID]:
    """Process occupation inputs and return list of valid occupation UUIDs.

    Creates new occupations for temp IDs and returns real UUIDs.

    Args:
        db: Database session instance.
        occupation_inputs: List of occupation IDs or occupation input objects.

    Returns:
        List of valid occupation UUIDs.
    """
    if not occupation_inputs:
        return []

    occupation_ids = []
    for occupation_input in occupation_inputs:
        if isinstance(occupation_input, str):
            # String ID - check if temp or real
            if _is_temp_id(occupation_input):
                logger.warning("Received temp occupation ID without name: %s", occupation_input)
                continue
            occupation_ids.append(UUID(occupation_input))
        else:
            # OccupationInput object
            if _is_temp_id(occupation_input.id):
                # Create new occupation
                new_occupation = Occupation(name=occupation_input.name)
                db.add(new_occupation)
                await db.flush()
                occupation_ids.append(new_occupation.id)
            else:
                # Use existing occupation ID
                occupation_ids.append(UUID(occupation_input.id))

    return occupation_ids


async def _process_status(
    db: AsyncSession,
    status_input: str | StatusInput | None,
) -> UUID | None:
    """Process status input and return valid status UUID.

    Creates new status for temp IDs and returns real UUID.

    Args:
        db: Database session instance.
        status_input: Status ID string or StatusInput object.

    Returns:
        Valid status UUID or None if no status provided.

    Raises:
        StatusNotFoundError: If status_id is invalid (not temp and not found).
    """
    if not status_input:
        return None

    if isinstance(status_input, str):
        # String ID - check if temp or real
        if _is_temp_id(status_input):
            logger.warning("Received temp status ID without name: %s", status_input)
            return None
        # Validate that status exists
        result = await db.execute(select(Status).where(Status.id == UUID(status_input)))
        if not result.scalar_one_or_none():
            raise StatusNotFoundError(status_input)
        return UUID(status_input)
    else:
        # StatusInput object
        if _is_temp_id(status_input.id):
            # Create new status
            # Get max sort_order to place new status at the end
            result = await db.execute(select(func.max(Status.sort_order)))
            max_sort_order = result.scalar() or 0
            new_status = Status(name=status_input.name, sort_order=max_sort_order + 1, is_active=True)
            db.add(new_status)
            await db.flush()
            return new_status.id
        else:
            # Validate that status exists
            result = await db.execute(select(Status).where(Status.id == UUID(status_input.id)))
            if not result.scalar_one_or_none():
                raise StatusNotFoundError(status_input.id)
            return UUID(status_input.id)


async def _build_contact_response(
    db: AsyncSession,
    contact: Contact,
) -> ContactResponse:
    """Build a full ContactResponse from a Contact model.

    Args:
        db: Database session instance.
        contact: Contact model instance (with relationships already eagerly loaded).

    Returns:
        Full ContactResponse with all related data.
    """
    # Note: Relationships should already be eagerly loaded via selectinload
    # in the calling function (get_contact, create_contact, update_contact)

    # Build status
    status = None
    if contact.status:
        status = StatusBase(id=str(contact.status.id), name=contact.status.name)

    # Build tags
    tags = [TagBase(id=str(tag.id), name=tag.name) for tag in contact.tags]

    # Build interests
    interests = [InterestBase(id=str(interest.id), name=interest.name) for interest in contact.interests]

    # Build occupations
    occupations = [OccupationBase(id=str(occ.id), name=occ.name) for occ in contact.occupations]

    # Build associations (relationships already eagerly loaded via selectinload)
    associations = []
    seen_ids = set()

    for assoc in contact.source_associations:
        target = assoc.target_contact
        if target.id not in seen_ids:
            associations.append(
                ContactAssociationBrief(
                    id=str(target.id),
                    first_name=target.first_name,
                    middle_name=target.middle_name,
                    last_name=target.last_name,
                )
            )
            seen_ids.add(target.id)

    for assoc in contact.target_associations:
        source = assoc.source_contact
        if source.id not in seen_ids:
            associations.append(
                ContactAssociationBrief(
                    id=str(source.id),
                    first_name=source.first_name,
                    middle_name=source.first_name,
                    last_name=source.last_name,
                )
            )
            seen_ids.add(source.id)

    # Generate signed photo URL if photo exists
    photo_url = None
    if contact.photo_path:
        try:
            photo_url = get_file_url(contact.photo_path)
        except Exception:
            logger.warning("Failed to generate signed URL for photo: %s", contact.photo_path)

    return ContactResponse(
        id=str(contact.id),
        first_name=contact.first_name,
        middle_name=contact.middle_name,
        last_name=contact.last_name,
        telegram_username=contact.telegram_username,
        linkedin_url=contact.linkedin_url,
        github_username=contact.github_username,
        met_at=contact.met_at,
        status_id=str(contact.status_id) if contact.status_id else None,
        status=status,
        notes=contact.notes,
        photo_path=contact.photo_path,
        photo_url=photo_url,
        tags=tags,
        interests=interests,
        occupations=occupations,
        associations=associations,
        sort_order_in_status=contact.sort_order_in_status,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


async def create_contact(
    db: AsyncSession,
    first_name: str,
    middle_name: str | None = None,
    last_name: str | None = None,
    telegram_username: str | None = None,
    linkedin_url: str | None = None,
    github_username: str | None = None,
    met_at: date | None = None,
    status_id: str | StatusInput | None = None,
    notes: str | None = None,
    tag_ids: list[str | TagInput] | None = None,
    interest_ids: list[str | InterestInput] | None = None,
    occupation_ids: list[str | OccupationInput] | None = None,
    association_contact_ids: list[str] | None = None,
) -> ContactResponse:
    """Create a new contact.

    Args:
        db: Database session instance.
        first_name: Contact's first name.
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        telegram_username: Telegram username.
        linkedin_url: LinkedIn profile URL.
        github_username: GitHub username.
        met_at: Date when contact was met.
        status_id: Status ID.
        notes: Additional notes.
        tag_ids: List of tag IDs or objects to associate (supports temp IDs).
        interest_ids: List of interest IDs or objects to associate (supports temp IDs).
        occupation_ids: List of occupation IDs or objects to associate (supports temp IDs).
        association_contact_ids: List of contact IDs to associate.

    Returns:
        Created contact with all related data.

    Raises:
        StatusNotFoundError: If status_id is invalid.
    """
    # Process status input (create new status if needed)
    processed_status_id = await _process_status(db, status_id)

    # Process tag/interest/occupation inputs (create new ones if needed)
    processed_tag_ids = await _process_tags(db, tag_ids)
    processed_interest_ids = await _process_interests(db, interest_ids)
    processed_occupation_ids = await _process_occupations(db, occupation_ids)

    # Create contact
    contact = Contact(
        first_name=first_name,
        middle_name=middle_name,
        last_name=last_name,
        telegram_username=telegram_username,
        linkedin_url=str(linkedin_url) if linkedin_url else None,
        github_username=github_username,
        met_at=met_at,
        status_id=processed_status_id,
        notes=notes,
    )
    db.add(contact)
    await db.flush()
    
    # Refresh contact to load lazy-loaded collections for async context
    await db.refresh(contact, attribute_names=["tags", "interests", "occupations"])

    # Load and associate tags
    if processed_tag_ids:
        result = await db.execute(select(Tag).where(Tag.id.in_(processed_tag_ids)))
        tags = result.scalars().all()
        contact.tags.extend(tags)

    # Load and associate interests
    if processed_interest_ids:
        result = await db.execute(select(Interest).where(Interest.id.in_(processed_interest_ids)))
        interests = result.scalars().all()
        contact.interests.extend(interests)

    # Load and associate occupations
    if processed_occupation_ids:
        result = await db.execute(select(Occupation).where(Occupation.id.in_(processed_occupation_ids)))
        occupations = result.scalars().all()
        contact.occupations.extend(occupations)

    # Create associations
    if association_contact_ids:
        for target_id in association_contact_ids:
            association = ContactAssociation(
                source_contact_id=contact.id,
                target_contact_id=UUID(target_id),
            )
            db.add(association)

    await db.flush()
    # Re-fetch the contact with all relationships eagerly loaded
    return await get_contact(db, str(contact.id))


async def get_contact(
    db: AsyncSession,
    contact_id: str,
) -> ContactResponse:
    """Get a single contact by ID.

    Args:
        db: Database session instance.
        contact_id: Contact ID to fetch.

    Returns:
        Contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    result = await db.execute(
        select(Contact)
        .where(Contact.id == UUID(contact_id))
        .options(
            selectinload(Contact.status),
            selectinload(Contact.tags),
            selectinload(Contact.interests),
            selectinload(Contact.occupations),
            selectinload(Contact.source_associations).selectinload(ContactAssociation.target_contact),
            selectinload(Contact.target_associations).selectinload(ContactAssociation.source_contact),
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise ContactNotFoundError(contact_id)

    return await _build_contact_response(db, contact)


async def list_contacts(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status_id: str | None = None,
    tag_ids: list[str] | None = None,
    interest_ids: list[str] | None = None,
    occupation_ids: list[str] | None = None,
    created_at_from: date | None = None,
    created_at_to: date | None = None,
    met_at_from: date | None = None,
    met_at_to: date | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> ContactListResponse:
    """List contacts with filtering and pagination.

    Args:
        db: Database session instance.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        status_id: Filter by status ID.
        tag_ids: Filter by tag IDs.
        interest_ids: Filter by interest IDs.
        occupation_ids: Filter by occupation IDs.
        created_at_from: Filter by creation date (from).
        created_at_to: Filter by creation date (to).
        met_at_from: Filter by met date (from).
        met_at_to: Filter by met date (to).
        search: Search in names.
        sort_by: Field to sort by.
        sort_order: Sort order (asc/desc).

    Returns:
        Paginated list of contacts.
    """
    # Build base query
    query = select(Contact)

    # Apply filters
    if status_id:
        query = query.where(Contact.status_id == UUID(status_id))

    if created_at_from:
        query = query.where(Contact.created_at >= created_at_from)

    if created_at_to:
        query = query.where(Contact.created_at <= created_at_to)

    if met_at_from:
        query = query.where(Contact.met_at >= met_at_from)

    if met_at_to:
        query = query.where(Contact.met_at <= met_at_to)

    # Track search words for post-filtering if multi-word search
    search_words: list[str] = []
    if search:
        # Split search into words to support full name search like "John Smith"
        search_words = search.strip().lower().split()
        # Build OR conditions for all words
        or_conditions = []
        for word in search_words:
            pattern = f"%{word}%"
            or_conditions.extend([
                Contact.first_name.ilike(pattern),
                Contact.last_name.ilike(pattern),
                Contact.middle_name.ilike(pattern),
            ])
        query = query.where(or_(*or_conditions))

    # Get contact IDs filtered by tags/interests/occupations
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
            .join(Contact.occupations)
            .where(Occupation.id.in_(occupation_uuid_ids))
            .group_by(Contact.id)
        )
        occupation_contact_ids = {row[0] for row in occupation_result}
        contact_ids_to_filter = (
            occupation_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & occupation_contact_ids
        )

    if contact_ids_to_filter is not None:
        if not contact_ids_to_filter:
            # No contacts match the filters
            return ContactListResponse(
                data=[],
                pagination=PaginationMeta(
                    page=page,
                    page_size=page_size,
                    total_items=0,
                    total_pages=0,
                ),
            )
        query = query.where(Contact.id.in_(contact_ids_to_filter))

    # Get total count before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_items = total_result.scalar_one()

    # Apply sorting
    sort_column = getattr(Contact, sort_by, Contact.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Load relationships
    query = query.options(
        selectinload(Contact.status),
        selectinload(Contact.tags),
    )

    # Execute query
    result = await db.execute(query)
    contacts = result.scalars().all()

    # Build response items
    items = []
    for contact in contacts:
        # Post-filter for multi-word search - all words must match at least one name field
        if len(search_words) > 1:
            full_name_parts = [
                (contact.first_name or "").lower(),
                (contact.middle_name or "").lower(),
                (contact.last_name or "").lower(),
            ]
            full_name = " ".join(full_name_parts)
            if not all(word in full_name for word in search_words):
                continue

        # Build status
        status = None
        if contact.status:
            status = StatusBase(id=str(contact.status.id), name=contact.status.name)

        # Build tags
        tags = [TagBase(id=str(tag.id), name=tag.name) for tag in contact.tags]

        # Generate signed photo URL if photo exists
        photo_url = None
        if contact.photo_path:
            try:
                photo_url = get_file_url(contact.photo_path)
            except Exception:
                logger.warning("Failed to generate signed URL for photo")

        items.append(
            ContactListItem(
                id=str(contact.id),
                first_name=contact.first_name,
                middle_name=contact.middle_name,
                last_name=contact.last_name,
                status=status,
                photo_url=photo_url,
                tags=tags,
                created_at=contact.created_at,
            )
        )

    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 0

    return ContactListResponse(
        data=items,
        pagination=PaginationMeta(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        ),
    )


async def update_contact(
    db: AsyncSession,
    contact_id: str,
    first_name: str | None = None,
    middle_name: str | None = None,
    last_name: str | None = None,
    telegram_username: str | None = None,
    linkedin_url: str | None = None,
    github_username: str | None = None,
    met_at: date | None = None,
    status_id: str | StatusInput | None = None,
    notes: str | None = None,
    photo_path: str | None = None,
    tag_ids: list[str | TagInput] | None = None,
    interest_ids: list[str | InterestInput] | None = None,
    occupation_ids: list[str | OccupationInput] | None = None,
    association_contact_ids: list[str] | None = None,
) -> ContactResponse:
    """Update a contact.

    Args:
        db: Database session instance.
        contact_id: Contact ID to update.
        first_name: Contact's first name.
        middle_name: Contact's middle name.
        last_name: Contact's last name.
        telegram_username: Telegram username.
        linkedin_url: LinkedIn profile URL.
        github_username: GitHub username.
        met_at: Date when contact was met.
        status_id: Status ID.
        notes: Additional notes.
        photo_path: Photo storage path.
        tag_ids: List of tag IDs or objects to associate (supports temp IDs).
        interest_ids: List of interest IDs or objects to associate (supports temp IDs).
        occupation_ids: List of occupation IDs or objects to associate (supports temp IDs).
        association_contact_ids: List of contact IDs to associate.

    Returns:
        Updated contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
        StatusNotFoundError: If status_id is invalid.
    """
    # Check contact exists and load it
    result = await db.execute(
        select(Contact)
        .where(Contact.id == UUID(contact_id))
        .options(
            selectinload(Contact.tags),
            selectinload(Contact.interests),
            selectinload(Contact.occupations),
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise ContactNotFoundError(contact_id)

    # Process status input if provided (create new status if needed)
    processed_status_id = None
    if status_id is not None:
        processed_status_id = await _process_status(db, status_id)

    # Update basic fields (only if non-None)
    if first_name is not None:
        contact.first_name = first_name
    if middle_name is not None:
        contact.middle_name = middle_name
    if last_name is not None:
        contact.last_name = last_name
    if telegram_username is not None:
        contact.telegram_username = telegram_username
    if linkedin_url is not None:
        contact.linkedin_url = str(linkedin_url)
    if github_username is not None:
        contact.github_username = github_username
    if met_at is not None:
        contact.met_at = met_at
    if status_id is not None:
        contact.status_id = processed_status_id
    if notes is not None:
        contact.notes = notes
    if photo_path is not None:
        contact.photo_path = photo_path

    # Update tags if provided
    if tag_ids is not None:
        # Process tag inputs (create new ones if needed)
        processed_tag_ids = await _process_tags(db, tag_ids)
        # Clear existing tags
        contact.tags.clear()
        # Load and add new tags
        if processed_tag_ids:
            tag_result = await db.execute(select(Tag).where(Tag.id.in_(processed_tag_ids)))
            tags = tag_result.scalars().all()
            contact.tags.extend(tags)

    # Update interests if provided
    if interest_ids is not None:
        # Process interest inputs (create new ones if needed)
        processed_interest_ids = await _process_interests(db, interest_ids)
        # Clear existing interests
        contact.interests.clear()
        # Load and add new interests
        if processed_interest_ids:
            interest_result = await db.execute(select(Interest).where(Interest.id.in_(processed_interest_ids)))
            interests = interest_result.scalars().all()
            contact.interests.extend(interests)

    # Update occupations if provided
    if occupation_ids is not None:
        # Process occupation inputs (create new ones if needed)
        processed_occupation_ids = await _process_occupations(db, occupation_ids)
        # Clear existing occupations
        contact.occupations.clear()
        # Load and add new occupations
        if processed_occupation_ids:
            occupation_result = await db.execute(select(Occupation).where(Occupation.id.in_(processed_occupation_ids)))
            occupations = occupation_result.scalars().all()
            contact.occupations.extend(occupations)

    # Update associations if provided
    if association_contact_ids is not None:
        # Delete existing associations where this contact is the source
        await db.execute(
            sql_delete(ContactAssociation).where(ContactAssociation.source_contact_id == contact.id)
        )
        # Create new associations
        if association_contact_ids:
            for target_id in association_contact_ids:
                association = ContactAssociation(
                    source_contact_id=contact.id,
                    target_contact_id=UUID(target_id),
                )
                db.add(association)

    await db.flush()
    return await get_contact(db, contact_id)


async def delete_contact(db: AsyncSession, contact_id: str) -> None:
    """Delete a contact.

    Args:
        db: Database session instance.
        contact_id: Contact ID to delete.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    # Check contact exists
    result = await db.execute(select(Contact).where(Contact.id == UUID(contact_id)))
    contact = result.scalar_one_or_none()
    if not contact:
        raise ContactNotFoundError(contact_id)

    # Delete contact (cascades to related tables)
    await db.delete(contact)
    await db.flush()
