# Personal CRM Backend

FastAPI backend for the Personal CRM application.

## Tech Stack

- Python 3.12+
- FastAPI
- SQLAlchemy (ORM)
- Alembic (migrations)
- PostgreSQL
- MinIO (S3-compatible storage)

## Development

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- PostgreSQL (via Docker recommended)
- MinIO (via Docker recommended)

### Setup

1. **Install dependencies**
   ```bash
   uv sync
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start databases with Docker** (recommended)
   ```bash
   # From project root
   docker compose up db minio -d
   ```

4. **Run database migrations**
   ```bash
   # Install migration dependencies
   uv sync --extra migrations
   
   # Run migrations
   uv run alembic upgrade head
   ```

5. **Start development server**
   ```bash
   # Watch only src directory to avoid permission issues with volumes
   uv run uvicorn app.main:app --reload --reload-dir src --host 0.0.0.0 --port 8000
   ```

The API will be available at http://localhost:8000

- API Documentation: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Environment Variables

Copy `.env.example` to `.env` and configure:

**Database (PostgreSQL):**
- `POSTGRES_HOST` - Database host (use `localhost` for local dev, `db` for Docker)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

**Storage (MinIO/S3):**
- `S3_ENDPOINT_URL` - MinIO endpoint (use `http://localhost:9000` for local dev)
- `S3_ACCESS_KEY_ID` - MinIO access key
- `S3_SECRET_ACCESS_KEY` - MinIO secret key
- `S3_BUCKET_NAME` - Bucket name for contact photos
- `S3_REGION` - S3 region

**Security:**
- `JWT_SECRET_KEY` - Secret key for JWT tokens (change in production!)
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)

**Application:**
- `APP_ENV` - Environment (development, production)
- `APP_DEBUG` - Debug mode (true/false)
- `APP_LOG_LEVEL` - Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

All variables have defaults in `.env.example` - modify as needed for your environment.

### Database Migrations

The application uses Alembic for database migrations. Migrations run in a separate Docker container, but you can also run them locally.

**Using the migrations dependency group:**
```bash
# Install migration dependencies
uv sync --extra migrations

# Apply all pending migrations
uv run alembic upgrade head

# Create a new migration (after modifying models)
uv run alembic revision --autogenerate -m "description of changes"

# Rollback last migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Fix linting issues automatically
uv run ruff check --fix .
```

## Running with Docker

Start all backend services (PostgreSQL, MinIO, API):

```bash
cd backend
docker compose up --build
```

The API will be available at http://localhost:8000

## Project Structure

```
backend/
├── src/app/
│   ├── api/              # API endpoints
│   │   └── v1/           # API version 1 routes
│   ├── core/             # Settings and configuration
│   ├── db/               # Database connection
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── migrations/           # SQL migration files
├── alembic/              # Alembic migration configs (if using Alembic)
├── .env.example          # Environment variables template
├── Dockerfile            # Docker configuration
├── docker-compose.yaml   # Docker Compose configuration
└── pyproject.toml        # Python project configuration
```
