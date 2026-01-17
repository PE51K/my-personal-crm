"""Join tables for many-to-many relationships."""

from sqlalchemy import ForeignKey, Table, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

# Contact to Tags many-to-many relationship
contact_tags = Table(
    "contact_tags",
    Base.metadata,
    mapped_column("contact_id", UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    mapped_column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

# Contact to Interests many-to-many relationship
contact_interests = Table(
    "contact_interests",
    Base.metadata,
    mapped_column("contact_id", UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    mapped_column("interest_id", UUID(as_uuid=True), ForeignKey("interests.id", ondelete="CASCADE"), primary_key=True),
)

# Contact to Occupations many-to-many relationship
contact_occupations = Table(
    "contact_occupations",
    Base.metadata,
    mapped_column("contact_id", UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    mapped_column("occupation_id", UUID(as_uuid=True), ForeignKey("occupations.id", ondelete="CASCADE"), primary_key=True),
)
