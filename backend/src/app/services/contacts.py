"""Contact business logic."""

import logging
import math
from datetime import date
from typing import Any

from supabase import Client

from app.core.errors import ContactNotFoundError, StatusNotFoundError
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
    TagBase,
    TagInput,
)
from app.services.supabase import get_signed_photo_url

logger = logging.getLogger(__name__)


def _is_temp_id(id_str: str) -> bool:
    """Check if an ID is a temporary ID."""
    return id_str.startswith("temp-")


def _process_tags(
    supabase: Client,
    tag_inputs: list[str | TagInput] | None,
) -> list[str]:
    """Process tag inputs and return list of valid tag IDs.

    Creates new tags for temp IDs and returns real UUIDs.

    Args:
        supabase: Supabase client instance.
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
            tag_ids.append(tag_input)
        else:
            # TagInput object
            if _is_temp_id(tag_input.id):
                # Create new tag
                result = supabase.table("tags").insert({"name": tag_input.name}).execute()
                if result.data:
                    tag_ids.append(result.data[0]["id"])
            else:
                # Use existing tag ID
                tag_ids.append(tag_input.id)

    return tag_ids


def _process_interests(
    supabase: Client,
    interest_inputs: list[str | InterestInput] | None,
) -> list[str]:
    """Process interest inputs and return list of valid interest IDs.

    Creates new interests for temp IDs and returns real UUIDs.

    Args:
        supabase: Supabase client instance.
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
            interest_ids.append(interest_input)
        else:
            # InterestInput object
            if _is_temp_id(interest_input.id):
                # Create new interest
                result = supabase.table("interests").insert({"name": interest_input.name}).execute()
                if result.data:
                    interest_ids.append(result.data[0]["id"])
            else:
                # Use existing interest ID
                interest_ids.append(interest_input.id)

    return interest_ids


def _process_occupations(
    supabase: Client,
    occupation_inputs: list[str | OccupationInput] | None,
) -> list[str]:
    """Process occupation inputs and return list of valid occupation IDs.

    Creates new occupations for temp IDs and returns real UUIDs.

    Args:
        supabase: Supabase client instance.
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
            occupation_ids.append(occupation_input)
        else:
            # OccupationInput object
            if _is_temp_id(occupation_input.id):
                # Create new occupation
                result = (
                    supabase.table("occupations").insert({"name": occupation_input.name}).execute()
                )
                if result.data:
                    occupation_ids.append(result.data[0]["id"])
            else:
                # Use existing occupation ID
                occupation_ids.append(occupation_input.id)

    return occupation_ids


def _build_contact_response(
    supabase: Client,
    contact: dict[str, Any],
) -> ContactResponse:
    """Build a full ContactResponse from raw contact data.

    Args:
        supabase: Supabase client for fetching related data.
        contact: Raw contact data from database.

    Returns:
        Full ContactResponse with all related data.
    """
    contact_id = contact["id"]

    # Fetch status
    status = None
    if contact.get("status_id"):
        status_result = (
            supabase.table("statuses").select("id, name").eq("id", contact["status_id"]).execute()
        )
        if status_result.data:
            status = StatusBase(**status_result.data[0])

    # Fetch tags
    tags_result = (
        supabase.table("contact_tags")
        .select("tags(id, name)")
        .eq("contact_id", contact_id)
        .execute()
    )
    tags = [TagBase(**t["tags"]) for t in tags_result.data if t.get("tags")]

    # Fetch interests
    interests_result = (
        supabase.table("contact_interests")
        .select("interests(id, name)")
        .eq("contact_id", contact_id)
        .execute()
    )
    interests = [
        InterestBase(**i["interests"]) for i in interests_result.data if i.get("interests")
    ]

    # Fetch occupations
    occupations_result = (
        supabase.table("contact_occupations")
        .select("occupations(id, name)")
        .eq("contact_id", contact_id)
        .execute()
    )
    occupations = [
        OccupationBase(**o["occupations"]) for o in occupations_result.data if o.get("occupations")
    ]

    # Fetch associations (contacts linked to this contact)
    target_select = (
        "target_contact_id, "
        "contacts!contact_associations_target_contact_id_fkey(id, first_name, middle_name, last_name)"
    )
    associations_result = (
        supabase.table("contact_associations")
        .select(target_select)
        .eq("source_contact_id", contact_id)
        .execute()
    )

    # Also get reverse associations
    source_select = (
        "source_contact_id, "
        "contacts!contact_associations_source_contact_id_fkey(id, first_name, middle_name, last_name)"
    )
    reverse_result = (
        supabase.table("contact_associations")
        .select(source_select)
        .eq("target_contact_id", contact_id)
        .execute()
    )

    associations = []
    seen_ids = set()

    for a in associations_result.data:
        if a.get("contacts") and a["contacts"]["id"] not in seen_ids:
            associations.append(ContactAssociationBrief(**a["contacts"]))
            seen_ids.add(a["contacts"]["id"])

    for a in reverse_result.data:
        if a.get("contacts") and a["contacts"]["id"] not in seen_ids:
            associations.append(ContactAssociationBrief(**a["contacts"]))
            seen_ids.add(a["contacts"]["id"])

    # Generate signed photo URL if photo exists
    photo_url = None
    if contact.get("photo_path"):
        try:
            photo_url, _ = get_signed_photo_url(supabase, contact["photo_path"])
        except Exception:
            logger.warning("Failed to generate signed URL for photo: %s", contact["photo_path"])

    return ContactResponse(
        id=contact["id"],
        first_name=contact["first_name"],
        middle_name=contact.get("middle_name"),
        last_name=contact.get("last_name"),
        telegram_username=contact.get("telegram_username"),
        linkedin_url=contact.get("linkedin_url"),
        github_username=contact.get("github_username"),
        met_at=contact.get("met_at"),
        status_id=contact.get("status_id"),
        status=status,
        notes=contact.get("notes"),
        photo_path=contact.get("photo_path"),
        photo_url=photo_url,
        tags=tags,
        interests=interests,
        occupations=occupations,
        associations=associations,
        sort_order_in_status=contact.get("sort_order_in_status", 0),
        created_at=contact["created_at"],
        updated_at=contact["updated_at"],
    )


def create_contact(
    supabase: Client,
    first_name: str,
    middle_name: str | None = None,
    last_name: str | None = None,
    telegram_username: str | None = None,
    linkedin_url: str | None = None,
    github_username: str | None = None,
    met_at: date | None = None,
    status_id: str | None = None,
    notes: str | None = None,
    tag_ids: list[str | TagInput] | None = None,
    interest_ids: list[str | InterestInput] | None = None,
    occupation_ids: list[str | OccupationInput] | None = None,
    association_contact_ids: list[str] | None = None,
) -> ContactResponse:
    """Create a new contact.

    Args:
        supabase: Supabase client instance.
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
    # Validate status_id if provided
    if status_id:
        status_result = supabase.table("statuses").select("id").eq("id", status_id).execute()
        if not status_result.data:
            raise StatusNotFoundError(status_id)

    # Process tag/interest/occupation inputs (create new ones if needed)
    processed_tag_ids = _process_tags(supabase, tag_ids)
    processed_interest_ids = _process_interests(supabase, interest_ids)
    processed_occupation_ids = _process_occupations(supabase, occupation_ids)

    # Create contact
    contact_data = {
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "telegram_username": telegram_username,
        "linkedin_url": str(linkedin_url) if linkedin_url else None,
        "github_username": github_username,
        "met_at": met_at.isoformat() if met_at else None,
        "status_id": status_id,
        "notes": notes,
    }

    result = supabase.table("contacts").insert(contact_data).execute()
    contact = result.data[0]
    contact_id = contact["id"]

    # Create or link tags
    if processed_tag_ids:
        tag_links = [{"contact_id": contact_id, "tag_id": tid} for tid in processed_tag_ids]
        supabase.table("contact_tags").insert(tag_links).execute()

    # Create or link interests
    if processed_interest_ids:
        interest_links = [
            {"contact_id": contact_id, "interest_id": iid} for iid in processed_interest_ids
        ]
        supabase.table("contact_interests").insert(interest_links).execute()

    # Create or link occupations
    if processed_occupation_ids:
        occupation_links = [
            {"contact_id": contact_id, "occupation_id": oid} for oid in processed_occupation_ids
        ]
        supabase.table("contact_occupations").insert(occupation_links).execute()

    # Create associations
    if association_contact_ids:
        association_links = [
            {"source_contact_id": contact_id, "target_contact_id": aid}
            for aid in association_contact_ids
        ]
        supabase.table("contact_associations").insert(association_links).execute()

    return _build_contact_response(supabase, contact)


def get_contact(supabase: Client, contact_id: str) -> ContactResponse:
    """Get a single contact by ID.

    Args:
        supabase: Supabase client instance.
        contact_id: Contact ID to fetch.

    Returns:
        Contact with all related data.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    result = supabase.table("contacts").select("*").eq("id", contact_id).execute()

    if not result.data:
        raise ContactNotFoundError(contact_id)

    return _build_contact_response(supabase, result.data[0])


def list_contacts(
    supabase: Client,
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
        supabase: Supabase client instance.
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
    query = supabase.table("contacts").select("*", count="exact")

    # Apply filters
    if status_id:
        query = query.eq("status_id", status_id)

    if created_at_from:
        query = query.gte("created_at", created_at_from.isoformat())

    if created_at_to:
        query = query.lte("created_at", created_at_to.isoformat())

    if met_at_from:
        query = query.gte("met_at", met_at_from.isoformat())

    if met_at_to:
        query = query.lte("met_at", met_at_to.isoformat())

    # Track search words for post-filtering if multi-word search
    search_words: list[str] = []
    if search:
        # Search in first_name, last_name, middle_name
        # Split search into words to support full name search like "John Smith"
        search_words = search.strip().lower().split()
        # Build OR conditions for all words - this gets contacts matching ANY word
        # We'll filter for ALL words in post-processing for multi-word searches
        or_conditions = []
        for word in search_words:
            or_conditions.append(f"first_name.ilike.%{word}%")
            or_conditions.append(f"last_name.ilike.%{word}%")
            or_conditions.append(f"middle_name.ilike.%{word}%")
        query = query.or_(",".join(or_conditions))

    # Get contact IDs filtered by tags/interests/occupations
    contact_ids_to_filter: set[str] | None = None

    if tag_ids:
        tag_result = (
            supabase.table("contact_tags").select("contact_id").in_("tag_id", tag_ids).execute()
        )
        tag_contact_ids = {r["contact_id"] for r in tag_result.data}
        contact_ids_to_filter = (
            tag_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & tag_contact_ids
        )

    if interest_ids:
        interest_result = (
            supabase.table("contact_interests")
            .select("contact_id")
            .in_("interest_id", interest_ids)
            .execute()
        )
        interest_contact_ids = {r["contact_id"] for r in interest_result.data}
        contact_ids_to_filter = (
            interest_contact_ids
            if contact_ids_to_filter is None
            else contact_ids_to_filter & interest_contact_ids
        )

    if occupation_ids:
        occupation_result = (
            supabase.table("contact_occupations")
            .select("contact_id")
            .in_("occupation_id", occupation_ids)
            .execute()
        )
        occupation_contact_ids = {r["contact_id"] for r in occupation_result.data}
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
        query = query.in_("id", list(contact_ids_to_filter))

    # Apply sorting
    query = query.order(sort_by, desc=(sort_order == "desc"))

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    # Execute query
    result = query.execute()

    # Build response items
    items = []
    for contact in result.data:
        # Post-filter for multi-word search - all words must match at least one name field
        if len(search_words) > 1:
            full_name_parts = [
                (contact.get("first_name") or "").lower(),
                (contact.get("middle_name") or "").lower(),
                (contact.get("last_name") or "").lower(),
            ]
            full_name = " ".join(full_name_parts)
            if not all(word in full_name for word in search_words):
                continue
        # Fetch status
        status = None
        if contact.get("status_id"):
            status_result = (
                supabase.table("statuses")
                .select("id, name")
                .eq("id", contact["status_id"])
                .execute()
            )
            if status_result.data:
                status = StatusBase(**status_result.data[0])

        # Fetch tags
        tags_result = (
            supabase.table("contact_tags")
            .select("tags(id, name)")
            .eq("contact_id", contact["id"])
            .execute()
        )
        tags = [TagBase(**t["tags"]) for t in tags_result.data if t.get("tags")]

        # Generate signed photo URL if photo exists
        photo_url = None
        if contact.get("photo_path"):
            try:
                photo_url, _ = get_signed_photo_url(supabase, contact["photo_path"])
            except Exception:
                logger.warning("Failed to generate signed URL for photo")

        items.append(
            ContactListItem(
                id=contact["id"],
                first_name=contact["first_name"],
                middle_name=contact.get("middle_name"),
                last_name=contact.get("last_name"),
                status=status,
                photo_url=photo_url,
                tags=tags,
                created_at=contact["created_at"],
            )
        )

    total_items = result.count or 0
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


def update_contact(
    supabase: Client,
    contact_id: str,
    first_name: str | None = None,
    middle_name: str | None = None,
    last_name: str | None = None,
    telegram_username: str | None = None,
    linkedin_url: str | None = None,
    github_username: str | None = None,
    met_at: date | None = None,
    status_id: str | None = None,
    notes: str | None = None,
    tag_ids: list[str | TagInput] | None = None,
    interest_ids: list[str | InterestInput] | None = None,
    occupation_ids: list[str | OccupationInput] | None = None,
    association_contact_ids: list[str] | None = None,
) -> ContactResponse:
    """Update a contact.

    Args:
        supabase: Supabase client instance.
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
    # Check contact exists
    existing = supabase.table("contacts").select("id").eq("id", contact_id).execute()
    if not existing.data:
        raise ContactNotFoundError(contact_id)

    # Validate status_id if provided
    if status_id:
        status_result = supabase.table("statuses").select("id").eq("id", status_id).execute()
        if not status_result.data:
            raise StatusNotFoundError(status_id)

    # Build update data (only include non-None values)
    update_data: dict[str, Any] = {}
    if first_name is not None:
        update_data["first_name"] = first_name
    if middle_name is not None:
        update_data["middle_name"] = middle_name
    if last_name is not None:
        update_data["last_name"] = last_name
    if telegram_username is not None:
        update_data["telegram_username"] = telegram_username
    if linkedin_url is not None:
        update_data["linkedin_url"] = str(linkedin_url)
    if github_username is not None:
        update_data["github_username"] = github_username
    if met_at is not None:
        update_data["met_at"] = met_at.isoformat()
    if status_id is not None:
        update_data["status_id"] = status_id
    if notes is not None:
        update_data["notes"] = notes

    # Update contact if there's data to update
    if update_data:
        supabase.table("contacts").update(update_data).eq("id", contact_id).execute()

    # Update tags if provided
    if tag_ids is not None:
        # Process tag inputs (create new ones if needed)
        processed_tag_ids = _process_tags(supabase, tag_ids)
        # Delete existing tags
        supabase.table("contact_tags").delete().eq("contact_id", contact_id).execute()
        # Insert new tags
        if processed_tag_ids:
            tag_links = [{"contact_id": contact_id, "tag_id": tid} for tid in processed_tag_ids]
            supabase.table("contact_tags").insert(tag_links).execute()

    # Update interests if provided
    if interest_ids is not None:
        # Process interest inputs (create new ones if needed)
        processed_interest_ids = _process_interests(supabase, interest_ids)
        supabase.table("contact_interests").delete().eq("contact_id", contact_id).execute()
        if processed_interest_ids:
            interest_links = [
                {"contact_id": contact_id, "interest_id": iid} for iid in processed_interest_ids
            ]
            supabase.table("contact_interests").insert(interest_links).execute()

    # Update occupations if provided
    if occupation_ids is not None:
        # Process occupation inputs (create new ones if needed)
        processed_occupation_ids = _process_occupations(supabase, occupation_ids)
        supabase.table("contact_occupations").delete().eq("contact_id", contact_id).execute()
        if processed_occupation_ids:
            occupation_links = [
                {"contact_id": contact_id, "occupation_id": oid} for oid in processed_occupation_ids
            ]
            supabase.table("contact_occupations").insert(occupation_links).execute()

    # Update associations if provided
    if association_contact_ids is not None:
        # Delete existing associations where this contact is the source
        supabase.table("contact_associations").delete().eq(
            "source_contact_id", contact_id
        ).execute()
        if association_contact_ids:
            association_links = [
                {"source_contact_id": contact_id, "target_contact_id": aid}
                for aid in association_contact_ids
            ]
            supabase.table("contact_associations").insert(association_links).execute()

    return get_contact(supabase, contact_id)


def delete_contact(supabase: Client, contact_id: str) -> None:
    """Delete a contact.

    Args:
        supabase: Supabase client instance.
        contact_id: Contact ID to delete.

    Raises:
        ContactNotFoundError: If contact doesn't exist.
    """
    # Check contact exists
    existing = supabase.table("contacts").select("id").eq("id", contact_id).execute()
    if not existing.data:
        raise ContactNotFoundError(contact_id)

    # Delete contact (cascades to related tables)
    supabase.table("contacts").delete().eq("id", contact_id).execute()
