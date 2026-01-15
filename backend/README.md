# Personal CRM Backend

FastAPI backend for the Personal CRM application.

## Development

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager

### Setup

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn app.main:app --reload
```

### Environment Variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Supabase credentials:

**Required variables:**
- `SUPABASE_URL` - Your Supabase project URL
  - Find: Supabase Dashboard → Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
  - Find: Supabase Dashboard → Project Settings → API → service_role key
- `SUPABASE_DB_URL` - PostgreSQL connection string (Transaction mode)
  - Find: Supabase Dashboard → Project Settings → Database → Connection String → Transaction Mode
  - **Note:** Used for running migrations on startup
- `SUPABASE_STORAGE_BUCKET` - Storage bucket name (default: `contact-photos`)

All other settings have sensible defaults and don't need to be changed for local development.

### Database Initialization

The FastAPI application automatically initializes on startup:
1. Runs all SQL migrations from `migrations/` directory
2. Creates the storage bucket for contact photos
3. Verifies the setup

This happens automatically when the API server starts, whether running with Docker or directly with uvicorn.

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Fix linting issues
uv run ruff check --fix .
```
