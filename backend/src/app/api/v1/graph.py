"""Graph API endpoints."""

from datetime import date

from fastapi import APIRouter, Query, status

from app.api.dependencies import CurrentOwner, DBSession
from app.schemas.graph import (
    EdgeCreateRequest,
    EdgeResponse,
    GraphResponse,
)
from app.services.graph import (
    create_edge,
    delete_edge,
    get_graph,
)

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get(
    "",
    response_model=GraphResponse,
    summary="Get graph",
    description="Get contacts and associations for graph visualization with optional filtering.",
)
async def get_graph_endpoint(
    current_user: CurrentOwner,
    db: DBSession,
    status_id: str | None = Query(default=None, description="Filter by status ID (single)"),
    status_ids: str | None = Query(default=None, description="Filter by status IDs (comma-separated, any match)"),
    tag_ids: str | None = Query(default=None, description="Filter by tag IDs (comma-separated, any match)"),
    interest_ids: str | None = Query(
        default=None, description="Filter by interest IDs (comma-separated, any match)"
    ),
    occupation_ids: str | None = Query(
        default=None, description="Filter by occupation IDs (comma-separated, any match)"
    ),
    position_ids: str | None = Query(
        default=None, description="Filter by position IDs (comma-separated, any match)"
    ),
    met_at_from: date | None = Query(default=None, description="Filter by met date (from)"),
    met_at_to: date | None = Query(default=None, description="Filter by met date (to)"),
    search: str | None = Query(default=None, description="Search in first, middle, last name"),
) -> GraphResponse:
    """Get contacts and associations for graph visualization with optional filtering.

    Returns filtered contacts as nodes and associations as edges.

    Args:
        current_user: Current authenticated owner.
        db: Database session.
        status_id: Filter by status ID (single).
        status_ids: Filter by status IDs (comma-separated, any match).
        tag_ids: Filter by tag IDs (comma-separated, any match).
        interest_ids: Filter by interest IDs (comma-separated, any match).
        occupation_ids: Filter by occupation IDs (comma-separated, any match).
        position_ids: Filter by position IDs (comma-separated, any match).
        met_at_from: Filter by met date (from).
        met_at_to: Filter by met date (to).
        search: Search in first, middle, last name.

    Returns:
        Graph with nodes and edges.
    """
    # Parse comma-separated IDs
    parsed_tag_ids = tag_ids.split(",") if tag_ids else None
    parsed_interest_ids = interest_ids.split(",") if interest_ids else None
    parsed_occupation_ids = occupation_ids.split(",") if occupation_ids else None
    parsed_position_ids = position_ids.split(",") if position_ids else None
    parsed_status_ids = status_ids.split(",") if status_ids else None

    return await get_graph(
        db=db,
        status_id=status_id,
        status_ids=parsed_status_ids,
        tag_ids=parsed_tag_ids,
        interest_ids=parsed_interest_ids,
        occupation_ids=parsed_occupation_ids,
        position_ids=parsed_position_ids,
        met_at_from=met_at_from,
        met_at_to=met_at_to,
        search=search,
    )


@router.post(
    "/edge",
    response_model=EdgeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create edge",
    description="Create an association between two contacts.",
    responses={
        404: {
            "description": "Contact not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "CONTACT_NOT_FOUND",
                            "message": "Contact with the specified ID was not found",
                        }
                    }
                }
            },
        },
        409: {
            "description": "Edge already exists",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "GRAPH_EDGE_EXISTS",
                            "message": "An association between these contacts already exists",
                        }
                    }
                }
            },
        },
    },
)
async def create_edge_endpoint(
    request: EdgeCreateRequest,
    current_user: CurrentOwner,
    db: DBSession,
) -> EdgeResponse:
    """Create an association between two contacts.

    Creates a bidirectional association between two contacts.
    The edge can have an optional label to describe the relationship.

    Args:
        request: Edge creation request.
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Created edge.

    Raises:
        ContactNotFoundError: If either contact doesn't exist.
        GraphEdgeExistsError: If edge already exists.
    """
    return await create_edge(
        db=db,
        source_id=request.source_id,
        target_id=request.target_id,
        label=request.label,
    )


@router.delete(
    "/edge/{edge_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete edge",
    description="Delete an association.",
    responses={
        404: {
            "description": "Edge not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "GRAPH_EDGE_NOT_FOUND",
                            "message": "Edge with the specified ID was not found",
                        }
                    }
                }
            },
        }
    },
)
async def delete_edge_endpoint(
    edge_id: str,
    current_user: CurrentOwner,
    db: DBSession,
) -> None:
    """Delete an association.

    Removes the association between two contacts. This action
    cannot be undone.

    Args:
        edge_id: Edge ID to delete.
        current_user: Current authenticated owner.
        db: Database session.

    Raises:
        GraphEdgeNotFoundError: If edge doesn't exist.
    """
    await delete_edge(db, edge_id)
