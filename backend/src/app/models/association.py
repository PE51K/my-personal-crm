"""Contact association model for relationship graph."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.contact import Contact


class ContactAssociation(Base):
    """Contact association model for relationship graph edges.

    Represents directed relationships between contacts.
    For example, "Alice knows Bob" is represented as a source (Alice) and target (Bob).
    """

    __tablename__ = "contact_associations"
    __table_args__ = (
        UniqueConstraint("source_contact_id", "target_contact_id", name="uq_contact_association"),
        CheckConstraint("source_contact_id != target_contact_id", name="check_no_self_association"),
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
