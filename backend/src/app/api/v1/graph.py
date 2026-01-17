"""Graph API endpoints."""

from fastapi import APIRouter, status

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
    description="Get all contacts and associations for graph visualization.",
)
async def get_graph_endpoint(
    current_user: CurrentOwner,
    db: DBSession,
) -> GraphResponse:
    """Get all contacts and associations for graph visualization.

    Returns all contacts as nodes and associations as edges.

    Args:
        current_user: Current authenticated owner.
        db: Database session.

    Returns:
        Graph with nodes and edges.
    """
    return await get_graph(db)


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
