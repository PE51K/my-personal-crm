# Database Migrations

This directory contains SQL migration files for the Personal CRM database schema.

## Automatic Migration

**Migrations are automatically applied when the FastAPI application starts.**

On startup, the backend API:
1. Applies all SQL migrations from this directory in order
2. Creates the storage bucket for contact photos
3. Verifies the database setup

No manual intervention is required for fresh deployments.

## Migration Files

| Migration | Date | Description |
|-----------|------|-------------|
| `000_initial_schema.sql` | 2026-01-15 | Complete database schema - creates all tables, indexes, triggers, and seeds default statuses |

## Manual Migration (Optional)

If you need to run migrations manually outside of Docker:

### Option 1: Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the SQL from the migration file
5. Click **Run** to execute

### Option 2: psql Command-Line

```bash
# Set your connection string (from Supabase Dashboard → Database → Connection String)
export DB_URL="postgresql://postgres.[ref]:[password]@[host]:6543/postgres"

# Run migration
psql "$DB_URL" -f 000_initial_schema.sql
```

### Option 3: Supabase CLI

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Order of Execution

Currently there is only one migration file that creates the complete schema:

1. `000_initial_schema.sql` - Complete database schema
2. Any future migrations...

## Migration Guidelines

- **Idempotent**: All migrations use `IF NOT EXISTS` where applicable to be safely re-runnable
- **Sequential**: Future migrations should be numbered sequentially (001, 002, etc.)
- **Verification**: Each migration includes verification queries at the end
- **Status Seeding**: Default statuses are seeded in the initial migration (idempotent)
- **Test First**: Always test migrations in a development environment before production

## Verification

After running migrations, verify the setup:

```sql
-- Check tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

## Troubleshooting

If initialization fails on startup:

```bash
# View application logs to see initialization errors
docker compose logs api

# Restart the API service to retry initialization
docker compose restart api
```

## Notes

- Always back up your database before running migrations in production
- Migrations are designed to be idempotent (safe to run multiple times)
- The startup process will skip migrations if they've already been applied (uses `IF NOT EXISTS` clauses)
