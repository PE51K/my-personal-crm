"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.settings import get_settings
from app.utils.errors import APIError
from app.db.migrations import initialize_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN201
    """Application lifespan handler.

    Handles startup and shutdown events for the application.

    Args:
        app: FastAPI application instance.

    Yields:
        None
    """
    # Startup
    settings = get_settings()
    logger.info("Starting Personal CRM API")

    # Initialize database and storage
    try:
        await initialize_app(settings)
    except Exception as e:
        logger.error("Failed to initialize application: %s", e)
        raise

    yield
    # Shutdown
    logger.info("Shutting down Personal CRM API")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title="Personal CRM API",
        description="Backend API for Personal CRM - manage your contacts and relationships",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.app.cors.origins,
        allow_credentials=settings.app.cors.allow_credentials,
        allow_methods=settings.app.cors.allow_methods,
        allow_headers=settings.app.cors.allow_headers,
    )

    # Include API router
    app.include_router(api_router)

    # Register exception handlers
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        """Handle APIError exceptions.

        Args:
            request: FastAPI request object.
            exc: APIError exception.

        Returns:
            JSON response with error details.
        """
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        """Handle unexpected exceptions.

        Args:
            request: FastAPI request object.
            exc: Exception that was raised.

        Returns:
            JSON response with error details.
        """
        logger.exception("Unexpected error: %s", exc)

        # Return generic error response
        detail: dict[str, Any] = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            }
        }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=detail,
        )

    # Health check endpoint
    @app.get(
        "/health",
        tags=["Health"],
        summary="Health check",
        description="Check if the API is running.",
    )
    async def health_check() -> dict[str, str]:
        """Health check endpoint.

        Returns:
            Health status.
        """
        return {"status": "healthy"}

    # Root endpoint
    @app.get(
        "/",
        tags=["Root"],
        summary="Root endpoint",
        description="API information.",
    )
    async def root() -> dict[str, str]:
        """Root endpoint with API information.

        Returns:
            API information.
        """
        return {
            "name": "Personal CRM API",
            "version": "0.1.0",
            "docs": "/api/docs",
        }

    return app


# Create the application instance
app = create_app()
