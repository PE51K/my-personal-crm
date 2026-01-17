"""SQLAlchemy models for the Personal CRM application."""

from app.models.association import ContactAssociation, ContactOccupation
from app.models.auth import AppOwner
from app.models.base import Base
from app.models.contact import Contact
from app.models.lookup import Interest, Occupation, Position, Tag
from app.models.status import Status
from app.models.tables import contact_interests, contact_occupation_positions, contact_tags

__all__ = [
    "AppOwner",
    "Base",
    "Contact",
    "ContactAssociation",
    "ContactOccupation",
    "Interest",
    "Occupation",
    "Position",
    "Status",
    "Tag",
    "contact_interests",
    "contact_occupation_positions",
    "contact_tags",
]
