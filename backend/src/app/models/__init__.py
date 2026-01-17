"""SQLAlchemy models for the Personal CRM application."""

from app.models.base import Base
from app.models.auth import AppOwner
from app.models.contact import Contact
from app.models.status import Status
from app.models.association import ContactAssociation
from app.models.lookup import Tag, Interest, Occupation
from app.models.tables import contact_tags, contact_interests, contact_occupations

__all__ = [
    "Base",
    "AppOwner",
    "Contact",
    "Status",
    "ContactAssociation",
    "Tag",
    "Interest",
    "Occupation",
    "contact_tags",
    "contact_interests",
    "contact_occupations",
]
