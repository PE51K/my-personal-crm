"""Database session management and dependency injection."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.settings import get_settings

# Get settings
_settings = get_settings()

# Create async engine
engine = create_async_engine(
    _settings.db.async_url,
    echo=_settings.app.logging.log_level.upper() == "DEBUG",  # Log SQL queries in debug mode
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=10,  # Number of connections to keep in the pool
    max_overflow=20,  # Maximum number of connections to create beyond pool_size
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevent expired object errors after commit
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection for database sessions.

    Yields:
        AsyncSession: Database session for the request.

    Usage:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Type alias for dependency injection
DBSession = Annotated[AsyncSession, Depends(get_db)]


__all__ = ["AsyncSessionLocal", "DBSession", "engine", "get_db"]
