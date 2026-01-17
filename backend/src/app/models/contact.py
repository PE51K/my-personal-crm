"""Contact model - main entity for storing contact information."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.tables import contact_interests, contact_tags

if TYPE_CHECKING:
    from app.models.association import ContactAssociation, ContactOccupation
    from app.models.lookup import Interest, Occupation, Position, Tag
    from app.models.status import Status


class Contact(Base):
    """Main contact model for storing contact information.

    Stores all information about a contact including personal details,
    social media links, status, notes, and relationships with other entities.
    """

    __tablename__ = "contacts"
    __table_args__ = (
        Index("idx_contacts_status_id", "status_id"),
        Index("idx_contacts_created_at", "created_at"),
        Index("idx_contacts_met_at", "met_at"),
    )

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Personal information
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    middle_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Social media & professional links
    telegram_username: Mapped[str | None] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_username: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Context & status
    met_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("statuses.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Media
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Positioning & ordering
    sort_order_in_status: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    position_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    position_y: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    # updated_at is managed by PostgreSQL trigger (see migrations)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    status: Mapped["Status | None"] = relationship(back_populates="contacts")
    tags: Mapped[list["Tag"]] = relationship(secondary=contact_tags, back_populates="contacts")
    interests: Mapped[list["Interest"]] = relationship(
        secondary=contact_interests, back_populates="contacts"
    )
    contact_occupations: Mapped[list["ContactOccupation"]] = relationship(
        back_populates="contact", cascade="all, delete-orphan"
    )

    # Self-referential relationships for contact associations (graph edges)
    source_associations: Mapped[list["ContactAssociation"]] = relationship(
        back_populates="source_contact",
        foreign_keys="ContactAssociation.source_contact_id",
        cascade="all, delete-orphan",
    )
    target_associations: Mapped[list["ContactAssociation"]] = relationship(
        back_populates="target_contact",
        foreign_keys="ContactAssociation.target_contact_id",
        cascade="all, delete-orphan",
    )
