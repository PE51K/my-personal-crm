"""Authentication and user models."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AppOwner(Base):
    """Application owner model with single-user constraint.

    This table enforces a single owner through the CHECK constraint.
    Only one user can be the owner of this personal CRM instance.
    """

    __tablename__ = "app_owner"
    __table_args__ = (CheckConstraint("id = 1", name="app_owner_single_row"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    user_id: Mapped[uuid.UUID] = mapped_column(
        "supabase_user_id", UUID(as_uuid=True), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
