"""SQLAlchemy models for the Personal CRM application."""

from app.models.association import ContactAssociation
from app.models.auth import AppOwner
from app.models.base import Base
from app.models.contact import Contact
from app.models.lookup import Interest, Occupation, Tag
from app.models.status import Status
from app.models.tables import contact_interests, contact_occupations, contact_tags

__all__ = [
    "AppOwner",
    "Base",
    "Contact",
    "ContactAssociation",
    "Interest",
    "Occupation",
    "Status",
    "Tag",
    "contact_interests",
    "contact_occupations",
    "contact_tags",
]
