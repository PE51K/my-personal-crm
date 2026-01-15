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

Copy `.env.example` to `.env` and fill in your Supabase credentials.

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Fix linting issues
uv run ruff check --fix .
```
