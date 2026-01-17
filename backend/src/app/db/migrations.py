"""Database migration and initialization utilities."""

import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.settings import Settings

logger = logging.getLogger(__name__)


def run_alembic_migrations() -> None:
    """Run Alembic database migrations.

    Raises:
        RuntimeError: If migrations fail to apply.
    """
    # Import alembic only when needed (migrations container only)
    from alembic import command
    from alembic.config import Config

    logger.info("============================================")
    logger.info("Running database migrations")
    logger.info("============================================")

    # Determine alembic.ini path (in backend directory)
    alembic_ini_path = Path(__file__).parent.parent.parent.parent / "alembic.ini"

    if not alembic_ini_path.exists():
        logger.error("Alembic configuration not found at %s", alembic_ini_path)
        raise RuntimeError("Alembic configuration file not found")

    try:
        # Create Alembic config
        alembic_cfg = Config(str(alembic_ini_path))

        # Run migrations to head
        logger.info("Upgrading database to latest migration...")
        command.upgrade(alembic_cfg, "head")
        logger.info("✓ All migrations completed")

    except Exception as e:
        logger.exception("✗ Migration failed")
        raise RuntimeError(f"Alembic migration failed: {e}") from e


def setup_storage_directory(settings: Settings) -> None:
    """Set up local storage directory for file uploads.

    Args:
        settings: Application settings.
    """
    logger.info("============================================")
    logger.info("Setting up storage - Using S3/MinIO")
    logger.info("============================================")

    # No local storage directory needed for S3/MinIO
    logger.info("✓ Using S3/MinIO at: %s", settings.s3.endpoint_url)


async def verify_database_connection(settings: Settings) -> None:
    """Verify database connection and tables exist.

    Args:
        settings: Application settings.
    """
    logger.info("============================================")
    logger.info("Verifying database setup")
    logger.info("============================================")

    try:
        # Create async engine
        engine = create_async_engine(settings.db.async_url, echo=False)

        async with engine.connect() as conn:
            # Check database connection
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("✓ Database connection successful")

            # Verify tables exist
            tables_query = text("""
                SELECT tablename FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename IN (
                    'app_owner', 'statuses', 'contacts', 'tags',
                    'interests', 'occupations', 'positions',
                    'contact_tags', 'contact_interests',
                    'contact_occupations', 'contact_occupation_positions',
                    'contact_associations'
                )
                ORDER BY tablename;
            """)

            result = await conn.execute(tables_query)
            tables = result.fetchall()

            if tables and any(table[0] == "app_owner" for table in tables):
                logger.info("✓ Database tables verified (%d tables found)", len(tables))
            else:
                logger.warning("WARNING: Some tables may be missing")

        await engine.dispose()

    except Exception as e:
        logger.warning("Could not verify database: %s", e)
        raise


async def initialize_app(settings: Settings) -> None:
    """Initialize application on startup.

    Sets up storage directory and verifies database connection.

    Args:
        settings: Application settings.

    Raises:
        RuntimeError: If initialization fails.
    """
    logger.info("============================================")
    logger.info("Application Initialization")
    logger.info("============================================")
    logger.info("")

    try:
        # Set up storage directory
        setup_storage_directory(settings)
        logger.info("")

        # Verify database setup
        await verify_database_connection(settings)
        logger.info("")

        logger.info("============================================")
        logger.info("✓ Initialization completed successfully")
        logger.info("============================================")
        logger.info("")

    except Exception:
        logger.error("============================================")
        logger.exception("✗ Initialization failed")
        logger.error("============================================")
        raise
