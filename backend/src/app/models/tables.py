"""Join tables for many-to-many relationships."""

from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

# Contact to Tags many-to-many relationship
contact_tags = Table(
    "contact_tags",
    Base.metadata,
    Column(
        "contact_id",
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    ),
)

# Contact to Interests many-to-many relationship
contact_interests = Table(
    "contact_interests",
    Base.metadata,
    Column(
        "contact_id",
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "interest_id",
        UUID(as_uuid=True),
        ForeignKey("interests.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# ContactOccupation to Positions many-to-many relationship
# This links positions to specific contact-occupation relationships
contact_occupation_positions = Table(
    "contact_occupation_positions",
    Base.metadata,
    Column(
        "contact_occupation_id",
        UUID(as_uuid=True),
        ForeignKey("contact_occupations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "position_id",
        UUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
