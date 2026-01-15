#!/usr/bin/env python3
"""
Database schema verification script.

This script checks if all required tables and indexes exist in the Supabase database.
Run this to verify that the initial schema migration has been applied successfully.

Usage:
    uv run python check_schema.py
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from app.core.config import get_settings
from app.services.supabase import get_supabase_client


def check_table_exists(supabase, table_name: str) -> bool:
    """Check if a table exists by trying to query it."""
    try:
        result = supabase.table(table_name).select("*").limit(1).execute()
        return True
    except Exception as e:
        return False


def main() -> None:
    """Check database schema."""
    print("=" * 70)
    print("DATABASE SCHEMA VERIFICATION")
    print("=" * 70)
    print()

    settings = get_settings()
    print(f"Connecting to: {settings.supabase_url}")
    print()

    supabase = get_supabase_client()

    # Required tables
    required_tables = [
        "app_owner",
        "statuses",
        "contacts",
        "tags",
        "interests",
        "occupations",
        "contact_tags",
        "contact_interests",
        "contact_occupations",
        "contact_associations",
    ]

    print("Checking required tables...")
    print("-" * 70)

    all_exist = True
    for table in required_tables:
        exists = check_table_exists(supabase, table)
        status = "✅" if exists else "❌"
        print(f"{status} {table}")
        if not exists:
            all_exist = False

    print()

    if all_exist:
        print("=" * 70)
        print("✅ SUCCESS: All required tables exist!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("1. Visit http://localhost:5173/ to access the application")
        print("2. Complete the setup wizard to create your owner account")
        print()
        sys.exit(0)
    else:
        print("=" * 70)
        print("❌ ERROR: Some required tables are missing!")
        print("=" * 70)
        print()
        print("Please apply the database migrations:")
        print()
        print("Option 1: Supabase Dashboard")
        print("  1. Go to https://app.supabase.com")
        print("  2. Select your project")
        print("  3. Navigate to SQL Editor")
        print("  4. Copy and paste the content of:")
        print("     backend/migrations/000_initial_schema.sql")
        print("  5. Click Run")
        print()
        print("Option 2: Supabase CLI")
        print("  supabase db execute --file backend/migrations/000_initial_schema.sql")
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
