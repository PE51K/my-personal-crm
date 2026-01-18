"""Contact association model for relationship graph."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.lookup import Occupation, Position


class ContactAssociation(Base):
    """Contact association model for relationship graph edges.

    Represents directed relationships between contacts.
    For example, "Alice knows Bob" is represented as a source (Alice) and target (Bob).
    """

    __tablename__ = "contact_associations"
    __table_args__ = (
        UniqueConstraint("source_contact_id", "target_contact_id", name="uq_contact_association"),
        CheckConstraint("source_contact_id != target_contact_id", name="check_no_self_association"),
        Index("idx_contact_associations_source", "source_contact_id"),
        Index("idx_contact_associations_target", "target_contact_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    target_contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    source_contact: Mapped["Contact"] = relationship(
        back_populates="source_associations", foreign_keys=[source_contact_id]
    )
    target_contact: Mapped["Contact"] = relationship(
        back_populates="target_associations", foreign_keys=[target_contact_id]
    )


class ContactOccupation(Base):
    """Contact-Occupation relationship model.

    Represents a many-to-many relationship between contacts and occupations.
    Each relationship can have multiple positions associated with it.
    """

    __tablename__ = "contact_occupations"
    __table_args__ = (
        UniqueConstraint("contact_id", "occupation_id", name="uq_contact_occupation"),
        Index("idx_contact_occupations_contact", "contact_id"),
        Index("idx_contact_occupations_occupation", "occupation_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    occupation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("occupations.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contact: Mapped["Contact"] = relationship(back_populates="contact_occupations")
    occupation: Mapped["Occupation"] = relationship(back_populates="contact_occupations")
    positions: Mapped[list["Position"]] = relationship(
        secondary="contact_occupation_positions", back_populates="contact_occupations"
    )
