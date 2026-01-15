"""Pydantic schemas for request/response models."""

from app.schemas.auth import (
    AuthTokenResponse,
    BootstrapRequest,
    BootstrapStatusResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    UserResponse,
)
from app.schemas.contact import (
    ContactAssociationBrief,
    ContactCreateRequest,
    ContactListItem,
    ContactListResponse,
    ContactResponse,
    ContactUpdateRequest,
    InterestBase,
    OccupationBase,
    PaginationMeta,
    PhotoUploadResponse,
    PhotoUrlResponse,
    StatusBase,
    TagBase,
    TagWithCount,
)
from app.schemas.graph import (
    EdgeCreateRequest,
    EdgeResponse,
    GraphEdge,
    GraphNode,
    GraphResponse,
)
from app.schemas.kanban import (
    KanbanMoveRequest,
    KanbanMoveResponse,
)
from app.schemas.status import (
    StatusCreateRequest,
    StatusListResponse,
    StatusReorderRequest,
    StatusReorderResponse,
    StatusResponse,
    StatusUpdateRequest,
)
from app.schemas.suggestion import (
    SuggestionItem,
    SuggestionListResponse,
)

__all__ = [
    "AuthTokenResponse",
    "BootstrapRequest",
    "BootstrapStatusResponse",
    "ContactAssociationBrief",
    "ContactCreateRequest",
    "ContactListItem",
    "ContactListResponse",
    "ContactResponse",
    "ContactUpdateRequest",
    "EdgeCreateRequest",
    "EdgeResponse",
    "GraphEdge",
    "GraphNode",
    "GraphResponse",
    "InterestBase",
    "KanbanMoveRequest",
    "KanbanMoveResponse",
    "LoginRequest",
    "LogoutRequest",
    "LogoutResponse",
    "OccupationBase",
    "PaginationMeta",
    "PhotoUploadResponse",
    "PhotoUrlResponse",
    "StatusBase",
    "StatusCreateRequest",
    "StatusListResponse",
    "StatusReorderRequest",
    "StatusReorderResponse",
    "StatusResponse",
    "StatusUpdateRequest",
    "SuggestionItem",
    "SuggestionListResponse",
    "TagBase",
    "TagWithCount",
    "UserResponse",
]
