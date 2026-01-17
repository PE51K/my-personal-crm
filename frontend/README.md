# Personal CRM Frontend

React frontend for the Personal CRM application.

## Tech Stack

- React 18
- TypeScript
- Vite (build tool)
- React Router (routing)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- dnd-kit (drag and drop)
- vis-network (graph visualization)

## Development

### Prerequisites

- Node.js 18+ (or use [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:5173

The dev server proxies `/api` requests to `http://localhost:8000` (backend).

### Environment Variables

Copy `.env.example` to `.env` and configure:

**API Configuration:**
- `VITE_API_BASE_URL` - Backend API base URL (default: `/api` for proxy, use `http://localhost:8000/api` for direct connection)

**Features:**
- `VITE_ENABLE_GRAPH_VIEW` - Enable/disable graph view feature (default: `true`)

All variables must be prefixed with `VITE_` to be exposed to the client. Variables have defaults in `.env.example` - modify as needed for your environment.

### Code Quality

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Running with Docker

Start the frontend service with Docker:

```bash
cd frontend
docker compose up --build
```

The application will be available at http://localhost:3000 (or the port specified by `FRONTEND_PORT` in your `.env` file).

The Docker setup uses Nginx to serve the built React app and proxy `/api` requests to the backend service.

### Docker Environment Variables

Configure in `frontend/.env`:

- `FRONTEND_PORT` - Port on which the frontend service will be exposed (default: 3000)

## Project Structure

```
frontend/
├── src/
│   ├── components/        # React components
│   │   ├── auth/         # Authentication components
│   │   ├── contacts/     # Contact-related components
│   │   ├── graph/        # Graph visualization components
│   │   ├── kanban/       # Kanban board components
│   │   ├── layout/       # Layout components
│   │   └── ui/           # Reusable UI components
│   ├── config/           # Configuration files
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API service functions
│   └── types/            # TypeScript type definitions
├── nginx/                 # Nginx configuration
├── .env.example          # Environment variables template
├── Dockerfile            # Docker configuration
├── docker-compose.yaml   # Docker Compose configuration
├── package.json          # Node.js project configuration
├── vite.config.ts        # Vite configuration
└── tailwind.config.ts    # Tailwind CSS configuration
```
