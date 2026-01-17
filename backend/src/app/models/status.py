"""Status model for Kanban board columns."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.contact import Contact


class Status(Base):
    """Status model for Kanban board columns.

    Statuses represent different stages in the contact management pipeline.
    Examples: "New", "Follow-up", "Active", "On Hold", etc.
    """

    __tablename__ = "statuses"
    __table_args__ = (
        Index("idx_statuses_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contacts: Mapped[list["Contact"]] = relationship(
        back_populates="status"
    )
