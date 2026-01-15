"""Application startup initialization."""

import logging
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from supabase import Client, create_client

from app.core.config import Settings

logger = logging.getLogger(__name__)


def run_migrations(db_url: str, migrations_dir: Path) -> None:
    """Run SQL migrations in order.

    Args:
        db_url: PostgreSQL database connection URL.
        migrations_dir: Path to directory containing migration SQL files.

    Raises:
        RuntimeError: If migrations fail to apply.
    """
    logger.info("============================================")
    logger.info("Running database migrations")
    logger.info("============================================")

    # Check if migrations directory exists
    if not migrations_dir.exists():
        logger.warning("Migrations directory not found at %s", migrations_dir)
        logger.warning("Skipping migration step...")
        return

    # Get all SQL migration files sorted by name
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.info("No SQL migration files found in %s", migrations_dir)
        logger.info("Skipping migration step...")
        return

    logger.info("Found %d migration file(s)", len(migration_files))

    # Connect to database with SSL support for Supabase
    try:
        # Parse URL and add SSL parameters
        parsed = urlparse(db_url)
        conn_params = {
            "host": parsed.hostname,
            "port": parsed.port or 5432,
            "database": parsed.path.lstrip("/") or "postgres",
            "user": parsed.username,
            "password": parsed.password,
            "sslmode": "require",
            "connect_timeout": 10,
        }
        conn = psycopg2.connect(**conn_params)
        conn.autocommit = False
        cursor = conn.cursor()

        # Run each migration
        for idx, migration_file in enumerate(migration_files, start=1):
            logger.info(
                "[%d/%d] Applying: %s",
                idx,
                len(migration_files),
                migration_file.name,
            )

            try:
                # Read and execute migration
                migration_sql = migration_file.read_text()
                cursor.execute(migration_sql)
                conn.commit()
                logger.info("✓ Migration applied successfully")

            except psycopg2.Error as e:
                conn.rollback()
                logger.error("✗ ERROR: Migration failed")
                logger.error("Error: %s", e)
                raise RuntimeError(f"Migration {migration_file.name} failed: {e}") from e

        cursor.close()
        conn.close()
        logger.info("✓ All migrations completed")

    except psycopg2.Error as e:
        logger.error("Database connection error: %s", e)
        raise RuntimeError(f"Failed to connect to database: {e}") from e


def create_storage_bucket(settings: Settings) -> None:
    """Create Supabase storage bucket if it doesn't exist.

    Args:
        settings: Application settings containing Supabase configuration.

    Raises:
        RuntimeError: If bucket creation fails.
    """
    logger.info("============================================")
    logger.info("Setting up storage bucket")
    logger.info("============================================")

    bucket_name = settings.supabase_storage_bucket

    # Initialize Supabase client with service role key
    supabase: Client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )

    # Check if bucket exists
    logger.info("Checking if bucket '%s' exists...", bucket_name)

    try:
        # Try to get bucket info
        existing_buckets = supabase.storage.list_buckets()
        bucket_exists = any(bucket.id == bucket_name for bucket in existing_buckets)

        if bucket_exists:
            logger.info("✓ Bucket '%s' already exists", bucket_name)
            return

        # Bucket doesn't exist, create it
        logger.info("Bucket does not exist. Creating...")

        supabase.storage.create_bucket(
            bucket_name,
            options={
                "public": False,
                "file_size_limit": 5242880,  # 5MB
                "allowed_mime_types": [
                    "image/jpeg",
                    "image/jpg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                ],
            },
        )

        logger.info("✓ Bucket '%s' created successfully", bucket_name)

    except Exception as e:
        error_msg = f"Error setting up storage bucket: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e


def verify_setup(settings: Settings, db_url: str) -> None:
    """Verify database tables and storage bucket exist.

    Args:
        settings: Application settings containing Supabase configuration.
        db_url: PostgreSQL database connection URL.
    """
    logger.info("============================================")
    logger.info("Verifying setup")
    logger.info("============================================")

    # Verify database tables
    logger.info("Verifying database tables...")
    try:
        # Parse URL and add SSL parameters
        parsed = urlparse(db_url)
        conn_params = {
            "host": parsed.hostname,
            "port": parsed.port or 5432,
            "database": parsed.path.lstrip("/") or "postgres",
            "user": parsed.username,
            "password": parsed.password,
            "sslmode": "require",
            "connect_timeout": 10,
        }
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        tables_query = """
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'app_owner', 'statuses', 'contacts', 'tags', 
            'interests', 'occupations', 'contact_tags', 
            'contact_interests', 'contact_occupations', 
            'contact_associations'
        )
        ORDER BY tablename;
        """

        cursor.execute(tables_query)
        tables = cursor.fetchall()

        if tables and any(table[0] == "app_owner" for table in tables):
            logger.info("✓ Database tables verified (%d tables found)", len(tables))
        else:
            logger.warning("WARNING: Some tables may be missing")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        logger.warning("Could not verify database tables: %s", e)

    # Verify storage bucket
    logger.info("Verifying storage bucket...")
    bucket_name = settings.supabase_storage_bucket

    try:
        supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

        existing_buckets = supabase.storage.list_buckets()
        bucket_exists = any(bucket.id == bucket_name for bucket in existing_buckets)

        if bucket_exists:
            logger.info("✓ Storage bucket verified")
        else:
            logger.warning("WARNING: Storage bucket not found")

    except Exception as e:
        logger.warning("Could not verify storage bucket: %s", e)


def initialize_app(settings: Settings) -> None:
    """Initialize application on startup.

    Runs database migrations and creates storage bucket.

    Args:
        settings: Application settings.

    Raises:
        RuntimeError: If initialization fails.
    """
    logger.info("============================================")
    logger.info("Application Initialization")
    logger.info("============================================")
    logger.info("")

    # Get database URL from settings
    db_url = settings.supabase_db_url

    # Determine migrations directory
    # Migrations are in backend/migrations relative to the app
    migrations_dir = Path(__file__).parent.parent.parent.parent / "migrations"

    try:
        # Run migrations
        run_migrations(db_url, migrations_dir)
        logger.info("")

        # Create storage bucket
        create_storage_bucket(settings)
        logger.info("")

        # Verify setup
        verify_setup(settings, db_url)
        logger.info("")

        logger.info("============================================")
        logger.info("✓ Initialization completed successfully")
        logger.info("============================================")
        logger.info("")

    except Exception as e:
        logger.error("============================================")
        logger.error("✗ Initialization failed: %s", e)
        logger.error("============================================")
        raise
