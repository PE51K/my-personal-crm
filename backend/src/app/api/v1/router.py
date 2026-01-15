"""API v1 router aggregator."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.graph import router as graph_router
from app.api.v1.kanban import router as kanban_router
from app.api.v1.statuses import router as statuses_router
from app.api.v1.suggestions import router as suggestions_router

api_router = APIRouter(prefix="/api/v1")

# Include all sub-routers
api_router.include_router(auth_router)
api_router.include_router(contacts_router)
api_router.include_router(statuses_router)
api_router.include_router(kanban_router)
api_router.include_router(suggestions_router)
api_router.include_router(graph_router)
