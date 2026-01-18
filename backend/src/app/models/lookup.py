"""Lookup table models for tags, interests, and occupations."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.tables import contact_interests, contact_tags

if TYPE_CHECKING:
    from app.models.association import ContactOccupation
    from app.models.contact import Contact


class Tag(Base):
    """Tag model for contact categorization.

    Tags are flexible labels that can be applied to contacts for
    organization and filtering (e.g., "VIP", "Tech", "Family").
    """

    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contacts: Mapped[list["Contact"]] = relationship(secondary=contact_tags, back_populates="tags")


class Interest(Base):
    """Interest model for contact interests.

    Tracks what topics or activities a contact is interested in
    (e.g., "AI", "Photography", "Cooking").
    """

    __tablename__ = "interests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contacts: Mapped[list["Contact"]] = relationship(
        secondary=contact_interests, back_populates="interests"
    )


class Occupation(Base):
    """Occupation model for contact professions.

    Tracks what contacts do professionally
    (e.g., "Software Engineer", "Designer", "Manager").
    """

    __tablename__ = "occupations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contact_occupations: Mapped[list["ContactOccupation"]] = relationship(
        back_populates="occupation", cascade="all, delete-orphan"
    )


class Position(Base):
    """Position model for contact job positions.

    Tracks what positions contacts hold (e.g., "CEO", "CTO", "Senior Developer").
    Positions are linked to contacts through contact-occupation relationships.
    """

    __tablename__ = "positions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    contact_occupations: Mapped[list["ContactOccupation"]] = relationship(
        secondary="contact_occupation_positions", back_populates="positions"
    )
