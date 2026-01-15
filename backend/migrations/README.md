# Database Migrations

This directory contains SQL migration files for database schema changes.

## How to Apply Migrations

You can apply these migrations using any of the following methods:

### Option 1: Supabase Dashboard
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the SQL from the migration file
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
# Run the initial schema first
supabase db execute --file migrations/000_initial_schema.sql

# Then run subsequent migrations
supabase db execute --file migrations/001_add_rls_index.sql
```

### Option 3: psql (Direct PostgreSQL connection)
```bash
# Run the initial schema first
psql $DATABASE_URL -f migrations/000_initial_schema.sql

# Then run subsequent migrations
psql $DATABASE_URL -f migrations/001_add_rls_index.sql
```

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `000_initial_schema.sql` | 2026-01-15 | Initial database schema - creates all tables, indexes, and seed data |
| `001_add_rls_index.sql` | 2026-01-15 | Add index on `app_owner.user_id` for RLS performance optimization |

## Order of Execution

**IMPORTANT**: Run migrations in numerical order:

1. First, run `000_initial_schema.sql` to create the base schema
2. Then, run `001_add_rls_index.sql` for additional optimizations

## Notes

- Always back up your database before running migrations in production
- Test migrations in a development/staging environment first
- Migrations are designed to be idempotent (safe to run multiple times)
