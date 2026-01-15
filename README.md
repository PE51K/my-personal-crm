# Personal CRM

A single-user personal CRM application for managing contacts with Kanban-style status tracking and relationship graph visualization.

## Architecture Overview

```
+------------------------------------------------------------------+
|                         Docker Compose                            |
|  +----------------------+    +------------------------------+    |
|  |      Frontend        |    |          Backend             |    |
|  |  +----------------+  |    |  +------------------------+  |    |
|  |  |  React + Vite  |  |    |  |   FastAPI + uvicorn    |  |    |
|  |  |  (TypeScript)  |  |    |  |      (Python 3.12)     |  |    |
|  |  +-------+--------+  |    |  +-----------+------------+  |    |
|  |          |           |    |              |               |    |
|  |  +-------v--------+  |    |              |               |    |
|  |  |     Nginx      |--+--->|-->  /api/*   |               |    |
|  |  |   (port 80)    |  |    |              |               |    |
|  |  +----------------+  |    |              v               |    |
|  +----------------------+    |  +------------------------+  |    |
|                              |  |       Supabase         |  |    |
|                              |  |  +------+------+----+  |  |    |
|                              |  |  | Auth |  DB  | S3 |  |  |    |
|                              |  |  +------+------+----+  |  |    |
|                              |  +------------------------+  |    |
|                              +------------------------------+    |
+------------------------------------------------------------------+
```

**Key Design Decisions:**

- Backend-only Supabase access: Frontend never communicates directly with Supabase
- Single-user enforcement: Only one user can be created (bootstrap), enforced at database level
- JWT verification: Backend verifies Supabase JWTs and checks owner identity on every request

## Prerequisites

- **Docker**: Version 24 or later
- **Docker Compose**: Version 2.20 or later (required for the `include` directive)
- **Supabase Project**: A Supabase project with the required tables and storage bucket

### Verifying Docker Compose Version

```bash
docker compose version
```

You should see version `2.20.0` or higher. If your version is older, please update Docker Desktop or install a newer version of the Docker Compose plugin.

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd my-personal-crm
```

### 2. Configure Environment Variables

Copy the example environment files and fill in your values:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=contact-photos
```

### 3. Start the Services

```bash
docker compose up --build
```

This will:
1. Build the backend container with Python 3.12 and uv
2. Build the frontend container with Node 20 and Nginx
3. Start both services on a shared Docker network

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (also accessible via http://localhost:3000/api)

## Services

### Backend (api)

- **Technology**: Python 3.12, FastAPI, uvicorn
- **Port**: 8000 (internal), mapped to host 8000
- **Features**:
  - Hot reload enabled for development
  - Multi-stage Docker build with uv for dependency management
  - Health check endpoint at `/api/v1/health`

### Frontend (web)

- **Technology**: React 18, TypeScript, Vite, Nginx 1.27
- **Port**: 80 (internal), mapped to host 3000
- **Features**:
  - Multi-stage Docker build (Node for build, Nginx for serving)
  - API proxy configuration for `/api/*` routes
  - SPA routing support with try_files fallback
  - Static asset caching with immutable headers

## Project Structure

```
my-personal-crm/
+-- docker-compose.yaml          # Root compose with include directive
+-- README.md                    # This file
+-- ARCHITECTURE.md              # Detailed architecture specification
+-- .gitignore
|
+-- backend/
|   +-- docker-compose.yaml      # Backend service definition
|   +-- Dockerfile               # Python 3.12 + uv multi-stage build
|   +-- .env.example             # Environment template
|   +-- pyproject.toml           # Python dependencies
|   +-- uv.lock                  # Locked dependencies
|   +-- src/
|       +-- app/                 # FastAPI application
|
+-- frontend/
    +-- docker-compose.yaml      # Frontend service definition
    +-- Dockerfile               # Node build + Nginx runtime
    +-- .env.example             # Environment template
    +-- nginx/
    |   +-- default.conf         # Nginx configuration
    +-- src/                     # React application source
```

## Docker Compose Architecture

This project uses the Docker Compose `include` directive to modularize configuration:

```yaml
# docker-compose.yaml (root)
include:
  - path: "backend/docker-compose.yaml"
    env_file: "backend/.env"
  - path: "frontend/docker-compose.yaml"
    env_file: "frontend/.env"
```

This approach provides:
- Clean separation of concerns between services
- Independent environment variable management per service
- Easy service toggling for development

## Common Commands

```bash
# Start all services
docker compose up

# Start with rebuild
docker compose up --build

# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f web

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Rebuild a specific service
docker compose build api
docker compose build web
```

## Networking

Both services communicate over a shared Docker network (`personal-crm-network`):

- The `api` service is accessible to the `web` service via hostname `api`
- Nginx proxies `/api/*` requests to `http://api:8000`
- External access is available on ports 3000 (frontend) and 8000 (backend)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Required |
| `SUPABASE_JWT_SECRET` | JWT secret for verification | Required |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name | `contact-photos` |
| `APP_ENV` | Environment name | `development` |
| `APP_DEBUG` | Enable debug mode | `true` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:3000"]` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `/api` |
| `VITE_ENABLE_GRAPH_VIEW` | Enable graph view | `true` |
| `VITE_ENABLE_CLUSTERING` | Enable clustering | `true` |

## Troubleshooting

### Docker Compose version error

If you see an error about the `include` directive, ensure your Docker Compose version is 2.20 or later:

```bash
docker compose version
```

### Port conflicts

If ports 3000 or 8000 are already in use, you can modify the port mappings in the respective `docker-compose.yaml` files.

### Backend health check failing

The backend health check expects a `/api/v1/health` endpoint. Ensure the FastAPI application is properly configured with this endpoint.

### Network connectivity issues

If the frontend cannot reach the backend, verify that both services are on the same network:

```bash
docker network inspect personal-crm-network
```

## Contributing

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed specifications that all implementing agents must follow.

## License

[Add your license here]
