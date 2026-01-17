# Personal CRM

A single-user personal CRM application for managing contacts with Kanban-style status tracking and relationship graph visualization.

## Tech Stack

### Backend
- Python 3.12
- FastAPI
- SQLAlchemy (ORM)
- Alembic (migrations)
- PostgreSQL
- MinIO (S3-compatible storage)
- JWT authentication

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Force-Graph (visualization)

### Infrastructure
- Docker & Docker Compose
- Nginx (production)
- PostgreSQL 16
- MinIO (latest)

## Project Structure

```
my-personal-crm/
├── backend/                    # FastAPI backend
│   ├── src/app/
│   │   ├── api/               # API endpoints
│   │   │   └── v1/            # Version 1 routes
│   │   ├── core/              # Settings and config
│   │   ├── db/                # Database connection
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities
│   ├── migrations/            # SQL migration files
│   ├── Dockerfile
│   ├── docker-compose.yaml
│   └── pyproject.toml
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # API clients
│   │   └── types/             # TypeScript types
│   ├── nginx/                 # Nginx config
│   ├── Dockerfile
│   ├── docker-compose.yaml
│   └── package.json
│
└── docker-compose.yaml         # Root compose file
```

## Quick Start (Development Mode)

### Prerequisites

- Docker and Docker Compose (v2.20+)
- Git
- Python 3.12+ (for local backend development)
- Node.js 18+ (for local frontend development)
- [uv](https://docs.astral.sh/uv/) package manager (for backend)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-personal-crm
   ```

2. **Configure environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration

   # Frontend (optional)
   cp frontend/.env.example frontend/.env
   ```

3. **Start databases with Docker**

   Databases always run in Docker. Docker Compose will automatically create the network and volumes. To start only the databases:
   ```bash
   docker compose up db minio -d
   ```

4. **Run backend locally**
   ```bash
   cd backend

   # Install dependencies with uv
   uv sync

   # Install migration dependencies and run migrations
   uv sync --extra migrations
   uv run alembic upgrade head

   # Start the API (watches only src directory to avoid permission issues with volumes)
   uv run uvicorn app.main:app --reload --reload-dir src --host 0.0.0.0 --port 8000
   ```

5. **Run frontend locally**

   In a new terminal:
   ```bash
   cd frontend

   # Install dependencies
   npm install

   # Start dev server
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - MinIO Console: http://localhost:9001

### Development Notes

- Databases (PostgreSQL and MinIO) always run in Docker
- Backend and frontend can run locally for hot reload
- Database data persists in `backend/volumes/` directory
- Backend uses `uv` for dependency management
- Frontend uses Vite for fast HMR

## Running with Docker (Production Mode)

To run everything in Docker:

```bash
# Start all services
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Access Points (Docker Mode)

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

### Docker Architecture

- All volumes are stored locally in `backend/volumes/`
- PostgreSQL data: `backend/volumes/postgres/`
- MinIO data: `backend/volumes/minio/`
- Services communicate via `personal-crm-network` Docker network

## Environment Variables

### Backend Required Variables

Edit `backend/.env`:

```bash
# Database
POSTGRES_HOST=localhost              # Use 'db' for Docker, 'localhost' for local dev
POSTGRES_PORT=5432
POSTGRES_DB=personal_crm
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=crm_password

# Storage (MinIO)
S3_ENDPOINT_URL=http://localhost:9000    # Use 'http://minio:9000' for Docker
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=contact-photos
S3_REGION=us-east-1

# Security
JWT_SECRET_KEY=your-secret-key-change-in-production
```

### Frontend Variables (Optional)

Edit `frontend/.env`:

```bash
VITE_API_BASE_URL=/api
```

## Common Commands

```bash
# Development with databases in Docker
docker compose up db minio -d        # Start databases only
cd backend && uv run uvicorn app.main:app --reload --reload-dir src
cd frontend && npm run dev

# Full Docker deployment
docker compose up --build            # Build and start all services
docker compose down                  # Stop all services

# Database management
docker compose exec db psql -U crm_user -d personal_crm
cd backend && uv sync --extra migrations && uv run alembic upgrade head
cd backend && uv sync --extra migrations && uv run alembic revision --autogenerate -m "description"

# View logs
docker compose logs -f api           # Backend logs
docker compose logs -f web           # Frontend logs
docker compose logs -f db            # Database logs
docker compose logs -f minio         # MinIO logs

# Code quality
cd backend && uv run ruff format .   # Format backend code
cd backend && uv run ruff check .    # Lint backend code
cd frontend && npm run lint          # Lint frontend code
```

## Features

- Contact management with customizable fields
- Kanban-style status tracking
- Relationship graph visualization
- Photo storage with MinIO
- Tag and category system
- Notes and interaction history
- Full-text search
- RESTful API with OpenAPI documentation

## Development Workflow

1. Create a feature branch
2. Make changes to backend/frontend
3. Run linters and formatters
4. Test locally with databases in Docker
5. Commit and push changes
6. Create pull request

## Troubleshooting

### Database Connection Issues

```bash
# Check database is running
docker compose ps db

# View database logs
docker compose logs db

# Connect to database directly
docker compose exec db psql -U crm_user -d personal_crm
```

### MinIO Connection Issues

```bash
# Check MinIO is running
docker compose ps minio

# View MinIO logs
docker compose logs minio

# Access MinIO console
open http://localhost:9001
```

### API Not Starting

```bash
# View API logs
docker compose logs api

# Check environment variables
docker compose exec api env | grep POSTGRES
```
