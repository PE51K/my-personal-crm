# Personal CRM - Architecture Specification

> **Source of Truth** for all implementing agents. All code must conform to this specification.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Milestones and Acceptance Criteria](#milestones-and-acceptance-criteria)
3. [Directory Structure](#directory-structure)
4. [Environment Variables](#environment-variables)
5. [API Contracts](#api-contracts)
6. [Data Models](#data-models)
7. [Error Response Format](#error-response-format)
8. [Authentication Flow](#authentication-flow)
9. [Technology Stack](#technology-stack)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Compose                          │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │      Frontend        │    │          Backend             │  │
│  │  ┌────────────────┐  │    │  ┌────────────────────────┐  │  │
│  │  │  React + Vite  │  │    │  │   FastAPI + uvicorn    │  │  │
│  │  │  (TypeScript)  │  │    │  │      (Python 3.12)     │  │  │
│  │  └───────┬────────┘  │    │  └───────────┬────────────┘  │  │
│  │          │           │    │              │               │  │
│  │  ┌───────▼────────┐  │    │              │               │  │
│  │  │     Nginx      │──┼────┼──►  /api/*   │               │  │
│  │  │  (port 80)     │  │    │              │               │  │
│  │  └────────────────┘  │    │              ▼               │  │
│  └──────────────────────┘    │  ┌────────────────────────┐  │  │
│                              │  │      Supabase          │  │  │
│                              │  │  ┌──────┬──────┬────┐  │  │  │
│                              │  │  │ Auth │  DB  │ S3 │  │  │  │
│                              │  │  └──────┴──────┴────┘  │  │  │
│                              │  └────────────────────────┘  │  │
│                              └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Architectural Decisions:**

- **Backend-only Supabase access**: Frontend never communicates directly with Supabase
- **Single-user enforcement**: Only one user can be created (bootstrap), enforced at database level
- **JWT verification**: Backend verifies Supabase JWTs and checks owner identity on every request

---

## Milestones and Acceptance Criteria

### Milestone A: Docker Compose Skeleton + CI Green

**Objective:** Establish the foundational infrastructure with working containers and passing CI.

#### Acceptance Criteria

- [ ] **A.1** Root `docker-compose.yaml` exists and uses Compose `include` directive to reference `backend/docker-compose.yaml` and `frontend/docker-compose.yaml`
- [ ] **A.2** Running `docker compose up` from project root starts both `api` and `web` services without errors
- [ ] **A.3** Backend container runs FastAPI with uvicorn on port 8000 (internal)
- [ ] **A.4** Frontend container serves static files via Nginx on port 80 (internal), mapped to host port 3000
- [ ] **A.5** Nginx proxies requests to `/api/*` to the backend service
- [ ] **A.6** `backend/.env.example` exists with all required environment variable placeholders
- [ ] **A.7** `frontend/.env.example` exists with `VITE_API_BASE_URL` placeholder
- [ ] **A.8** GitHub Actions workflow `backend.yml` runs successfully:
  - `uv sync --frozen`
  - `ruff format --check`
  - `ruff check`
- [ ] **A.9** GitHub Actions workflow `frontend.yml` runs successfully:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- [ ] **A.10** `README.md` documents local development setup with minimum Docker Compose version (v2.20+)

---

### Milestone B: Backend Auth/Bootstrap + Core Schema + CRUD Contacts

**Objective:** Complete backend with authentication, database schema, and contact management.

#### Acceptance Criteria

##### Bootstrap & Authentication

- [ ] **B.1** `GET /api/v1/auth/bootstrap/status` returns `{ "initialized": false }` when `app_owner` table is empty
- [ ] **B.2** `GET /api/v1/auth/bootstrap/status` returns `{ "initialized": true }` when `app_owner` has a row
- [ ] **B.3** `POST /api/v1/auth/bootstrap` creates Supabase Auth user, inserts `app_owner` row, seeds default statuses, returns tokens
- [ ] **B.4** `POST /api/v1/auth/bootstrap` returns HTTP 409 if `app_owner` already exists
- [ ] **B.5** `POST /api/v1/auth/login` exchanges email+password for access/refresh tokens via Supabase Auth
- [ ] **B.6** `POST /api/v1/auth/login` returns HTTP 401 for invalid credentials
- [ ] **B.7** `POST /api/v1/auth/logout` invalidates the refresh token
- [ ] **B.8** `GET /api/v1/auth/me` returns current user info when valid JWT provided
- [ ] **B.9** All protected endpoints return HTTP 401 when no/invalid JWT provided
- [ ] **B.10** All protected endpoints return HTTP 403 if JWT user does not match `app_owner`

##### Database Schema

- [ ] **B.11** Migration creates `app_owner` table with single-row constraint (id=1)
- [ ] **B.12** Migration creates `contacts` table with all specified fields
- [ ] **B.13** Migration creates `statuses` table with `sort_order` and `is_active` fields
- [ ] **B.14** Migration creates lookup tables: `tags`, `interests`, `occupations`
- [ ] **B.15** Migration creates join tables: `contact_tags`, `contact_interests`, `contact_occupations`
- [ ] **B.16** Migration creates `contact_associations` table for graph edges
- [ ] **B.17** Default statuses are seeded: "New", "Active", "Inactive", "Archived"

##### Contacts CRUD

- [ ] **B.18** `POST /api/v1/contacts` creates a contact with all specified fields
- [ ] **B.19** `GET /api/v1/contacts` returns paginated list of contacts
- [ ] **B.20** `GET /api/v1/contacts` supports filtering by: tags, interests, occupations, status_id, created_at range, met_at range
- [ ] **B.21** `GET /api/v1/contacts/{id}` returns single contact with all related data
- [ ] **B.22** `GET /api/v1/contacts/{id}` returns HTTP 404 for non-existent contact
- [ ] **B.23** `PATCH /api/v1/contacts/{id}` updates specified fields only
- [ ] **B.24** `POST /api/v1/contacts/{id}/photo` uploads photo to Supabase Storage
- [ ] **B.25** `GET /api/v1/contacts/{id}/photo-url` returns signed URL (5-minute expiry)

##### Statuses & Suggestions

- [ ] **B.26** `GET /api/v1/statuses` returns all statuses ordered by `sort_order`
- [ ] **B.27** `POST /api/v1/statuses` creates new status
- [ ] **B.28** `PATCH /api/v1/statuses/{id}` updates status name/is_active
- [ ] **B.29** `POST /api/v1/statuses/reorder` updates `sort_order` for all statuses
- [ ] **B.30** `GET /api/v1/suggestions/tags?q=` returns matching tags (autocomplete)
- [ ] **B.31** `GET /api/v1/suggestions/interests?q=` returns matching interests
- [ ] **B.32** `GET /api/v1/suggestions/occupations?q=` returns matching occupations

---

### Milestone C: Frontend Setup/Login + AddContact + PersonCard

**Objective:** Core frontend with authentication flow and contact management UI.

#### Acceptance Criteria

##### Setup & Configuration

- [ ] **C.1** React + Vite project builds without TypeScript errors (`tsc --noEmit` passes)
- [ ] **C.2** ESLint configured with `@typescript-eslint/no-explicit-any: error`
- [ ] **C.3** All components use strict TypeScript (no `any` types)
- [ ] **C.4** TanStack Query configured for server state management
- [ ] **C.5** React Router configured with protected route wrapper

##### Authentication UI

- [ ] **C.6** App checks `/api/v1/auth/bootstrap/status` on initial load
- [ ] **C.7** SetupOwner screen displays when `initialized: false`
- [ ] **C.8** SetupOwner form validates email format and password strength (min 8 chars)
- [ ] **C.9** SetupOwner form submits to `/api/v1/auth/bootstrap` and stores tokens
- [ ] **C.10** Login screen displays when `initialized: true`
- [ ] **C.11** Login form submits to `/api/v1/auth/login` and stores tokens
- [ ] **C.12** Failed login displays error message
- [ ] **C.13** Successful login redirects to main dashboard
- [ ] **C.14** Logout clears tokens and redirects to login

##### AddContact Page

- [ ] **C.15** AddContact form includes all contact fields (names, social links, dates, notes)
- [ ] **C.16** Photo upload field with preview
- [ ] **C.17** Status selector dropdown populated from `/api/v1/statuses`
- [ ] **C.18** Tags input with autocomplete from `/api/v1/suggestions/tags`
- [ ] **C.19** Interests input with autocomplete from `/api/v1/suggestions/interests`
- [ ] **C.20** Occupations input with autocomplete from `/api/v1/suggestions/occupations`
- [ ] **C.21** Associations picker allows selecting existing contacts
- [ ] **C.22** Form submission creates contact via `POST /api/v1/contacts`
- [ ] **C.23** Success redirects to contact detail or Kanban view

##### PersonCard Modal

- [ ] **C.24** PersonCard opens when clicking a contact anywhere in the app
- [ ] **C.25** PersonCard displays all contact fields with photo
- [ ] **C.26** All fields are editable inline
- [ ] **C.27** Save button submits changes via `PATCH /api/v1/contacts/{id}`
- [ ] **C.28** Cancel button discards unsaved changes
- [ ] **C.29** Delete button removes contact (with confirmation)

---

### Milestone D: Kanban with Drag/Drop + Filters

**Objective:** Kanban board with drag-and-drop contact management and filtering.

#### Acceptance Criteria

##### Kanban Board

- [ ] **D.1** Kanban board displays columns for each active status (ordered by `sort_order`)
- [ ] **D.2** Each column header shows status name and contact count
- [ ] **D.3** Contact cards display in their respective status columns
- [ ] **D.4** Contact cards show: photo (or initials), name, key tags
- [ ] **D.5** Clicking a card opens PersonCard modal

##### Drag and Drop (using @dnd-kit)

- [ ] **D.6** Contacts can be dragged between status columns
- [ ] **D.7** Dropping a contact in a new column calls `POST /api/v1/kanban/move`
- [ ] **D.8** Contacts can be reordered within a column
- [ ] **D.9** Visual feedback during drag (placeholder, opacity change)
- [ ] **D.10** Keyboard accessibility for drag operations

##### Filters

- [ ] **D.11** Filter panel with collapsible sections
- [ ] **D.12** Date range filter for `created_at`
- [ ] **D.13** Date range filter for `met_at`
- [ ] **D.14** Multi-select filter for tags
- [ ] **D.15** Multi-select filter for interests
- [ ] **D.16** Multi-select filter for occupations
- [ ] **D.17** Filters apply immediately (no submit button)
- [ ] **D.18** Active filters shown as removable chips
- [ ] **D.19** "Clear all filters" button

##### Backend Support

- [ ] **D.20** `POST /api/v1/kanban/move` endpoint updates contact's `status_id` and `sort_order_in_status`
- [ ] **D.21** Kanban move is atomic (no partial updates)

---

### Milestone E: Graph View + Edge Creation + Basic Clustering

**Objective:** Interactive network graph visualization with relationship management.

#### Acceptance Criteria

##### Graph Visualization (using React Flow)

- [ ] **E.1** Graph view renders all contacts as nodes
- [ ] **E.2** Node displays contact photo (or initials) and name
- [ ] **E.3** Edges represent `contact_associations`
- [ ] **E.4** Graph supports pan and zoom
- [ ] **E.5** Clicking a node opens PersonCard modal
- [ ] **E.6** Nodes can be repositioned (positions optionally persisted)

##### Edge Creation

- [ ] **E.7** Drag from one node to another to create an edge
- [ ] **E.8** Edge creation calls `POST /api/v1/graph/edge`
- [ ] **E.9** Optional label input when creating edge
- [ ] **E.10** Right-click edge shows context menu with "Delete" option
- [ ] **E.11** Delete edge calls `DELETE /api/v1/graph/edge/{id}`

##### Clustering

- [ ] **E.12** `POST /api/v1/graph/clusters/recompute` calculates connected components
- [ ] **E.13** Clusters are visually distinguished (color coding or grouping)
- [ ] **E.14** Filter by cluster in Kanban view (future: Milestone D extension)

##### Backend Support

- [ ] **E.15** `GET /api/v1/graph` returns nodes (contacts) and edges (associations)
- [ ] **E.16** `POST /api/v1/graph/edge` creates association with optional label
- [ ] **E.17** `DELETE /api/v1/graph/edge/{id}` removes association
- [ ] **E.18** Clustering algorithm runs server-side and stores cluster_id on contacts

---

## Directory Structure

```
my-personal-crm/
├── docker-compose.yaml              # Root compose with include directive
├── README.md                        # Setup instructions, minimum versions
├── ARCHITECTURE.md                  # This file - source of truth
├── .gitignore
├── .github/
│   └── workflows/
│       ├── backend.yml              # Backend CI: uv sync, ruff, tests
│       └── frontend.yml             # Frontend CI: npm, lint, typecheck, build
│
├── backend/
│   ├── docker-compose.yaml          # Backend service definition
│   ├── Dockerfile                   # Python 3.12 + uv
│   ├── .env.example                 # Environment template
│   ├── pyproject.toml               # uv + ruff + dependencies
│   ├── uv.lock                      # Locked dependencies
│   └── src/
│       └── app/
│           ├── __init__.py
│           ├── main.py              # FastAPI app entry point
│           ├── core/
│           │   ├── __init__.py
│           │   ├── config.py        # pydantic-settings configuration
│           │   ├── security.py      # JWT verification, password hashing
│           │   └── deps.py          # Dependency injection (get_current_user, get_db)
│           ├── api/
│           │   ├── __init__.py
│           │   └── v1/
│           │       ├── __init__.py
│           │       ├── router.py    # Aggregates all v1 routes
│           │       ├── auth.py      # /auth/* endpoints
│           │       ├── contacts.py  # /contacts/* endpoints
│           │       ├── statuses.py  # /statuses/* endpoints
│           │       ├── kanban.py    # /kanban/* endpoints
│           │       ├── suggestions.py # /suggestions/* endpoints
│           │       └── graph.py     # /graph/* endpoints
│           ├── models/
│           │   ├── __init__.py
│           │   ├── owner.py         # AppOwner model
│           │   ├── contact.py       # Contact model
│           │   ├── status.py        # Status model
│           │   ├── lookups.py       # Tag, Interest, Occupation models
│           │   └── association.py   # ContactAssociation model
│           ├── schemas/
│           │   ├── __init__.py
│           │   ├── auth.py          # Auth request/response schemas
│           │   ├── contact.py       # Contact schemas
│           │   ├── status.py        # Status schemas
│           │   ├── kanban.py        # Kanban schemas
│           │   ├── suggestion.py    # Suggestion schemas
│           │   └── graph.py         # Graph schemas
│           └── services/
│               ├── __init__.py
│               ├── supabase.py      # Supabase client wrapper
│               ├── auth.py          # Auth business logic
│               ├── contacts.py      # Contact business logic
│               └── graph.py         # Graph/clustering logic
│
└── frontend/
    ├── docker-compose.yaml          # Frontend service definition
    ├── Dockerfile                   # Multi-stage: build + nginx
    ├── .env.example                 # Environment template
    ├── nginx/
    │   └── default.conf             # Nginx config with /api proxy
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json                # Strict TypeScript config
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── eslint.config.js             # ESLint flat config
    ├── index.html
    └── src/
        ├── main.tsx                 # App entry point
        ├── App.tsx                  # Root component with providers
        ├── vite-env.d.ts
        ├── types/
        │   ├── index.ts             # Re-exports all types
        │   ├── api.ts               # API response types
        │   ├── contact.ts           # Contact types
        │   ├── status.ts            # Status types
        │   └── graph.ts             # Graph types
        ├── config/
        │   └── env.ts               # Environment variable access
        ├── hooks/
        │   ├── useAuth.ts           # Auth state and actions
        │   ├── useContacts.ts       # Contact queries/mutations
        │   ├── useStatuses.ts       # Status queries/mutations
        │   └── useGraph.ts          # Graph queries/mutations
        ├── services/
        │   ├── api.ts               # Axios/fetch client with auth
        │   ├── auth.ts              # Auth API calls
        │   ├── contacts.ts          # Contacts API calls
        │   ├── statuses.ts          # Statuses API calls
        │   └── graph.ts             # Graph API calls
        ├── components/
        │   ├── ui/                   # Reusable UI primitives
        │   │   ├── Button.tsx
        │   │   ├── Input.tsx
        │   │   ├── Modal.tsx
        │   │   ├── Card.tsx
        │   │   └── ...
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── Layout.tsx
        │   ├── auth/
        │   │   ├── SetupOwnerForm.tsx
        │   │   ├── LoginForm.tsx
        │   │   └── ProtectedRoute.tsx
        │   ├── contacts/
        │   │   ├── ContactForm.tsx
        │   │   ├── PersonCard.tsx
        │   │   ├── ContactCard.tsx
        │   │   └── PhotoUpload.tsx
        │   ├── kanban/
        │   │   ├── KanbanBoard.tsx
        │   │   ├── KanbanColumn.tsx
        │   │   ├── KanbanCard.tsx
        │   │   └── FilterPanel.tsx
        │   └── graph/
        │       ├── GraphView.tsx
        │       ├── ContactNode.tsx
        │       └── AssociationEdge.tsx
        └── pages/
            ├── SetupPage.tsx
            ├── LoginPage.tsx
            ├── DashboardPage.tsx
            ├── AddContactPage.tsx
            ├── KanbanPage.tsx
            └── GraphPage.tsx
```

---

## Environment Variables

### Backend (`backend/.env.example`)

```bash
# =============================================================================
# Supabase Configuration (Required)
# =============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=contact-photos

# =============================================================================
# Application Configuration
# =============================================================================
APP_ENV=development
APP_DEBUG=true
APP_LOG_LEVEL=INFO

# =============================================================================
# Security
# =============================================================================
CORS_ORIGINS=["http://localhost:3000"]
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# =============================================================================
# Server
# =============================================================================
HOST=0.0.0.0
PORT=8000
```

### Frontend (`frontend/.env.example`)

```bash
# =============================================================================
# API Configuration
# =============================================================================
VITE_API_BASE_URL=/api

# =============================================================================
# Feature Flags (optional)
# =============================================================================
VITE_ENABLE_GRAPH_VIEW=true
VITE_ENABLE_CLUSTERING=true
```

---

## API Contracts

### Base URL

All API endpoints are prefixed with `/api/v1`.

### Authentication Header

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

---

### Auth Endpoints

#### `GET /api/v1/auth/bootstrap/status`

Check if the application has been initialized.

**Authentication:** None required

**Response 200:**

```json
{
  "initialized": false
}
```

---

#### `POST /api/v1/auth/bootstrap`

Create the single owner account and initialize the application.

**Authentication:** None required (only works when not initialized)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 201:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Response 409 (Already Initialized):**

```json
{
  "error": {
    "code": "AUTH_ALREADY_INITIALIZED",
    "message": "Application has already been initialized with an owner account"
  }
}
```

---

#### `POST /api/v1/auth/login`

Authenticate and receive tokens.

**Authentication:** None required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 200:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Response 401:**

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

#### `POST /api/v1/auth/logout`

Invalidate the current refresh token.

**Authentication:** Required

**Request Body:**

```json
{
  "refresh_token": "eyJhbG..."
}
```

**Response 200:**

```json
{
  "message": "Successfully logged out"
}
```

---

#### `GET /api/v1/auth/me`

Get current authenticated user information.

**Authentication:** Required

**Response 200:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### Contacts Endpoints

#### `POST /api/v1/contacts`

Create a new contact.

**Authentication:** Required

**Request Body:**

```json
{
  "first_name": "John",
  "middle_name": "Robert",
  "last_name": "Doe",
  "telegram_username": "johndoe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_username": "johndoe",
  "met_at": "2024-01-10",
  "status_id": "uuid",
  "notes": "Met at tech conference",
  "tag_ids": ["uuid1", "uuid2"],
  "interest_ids": ["uuid1"],
  "occupation_ids": ["uuid1"],
  "association_contact_ids": ["uuid1", "uuid2"]
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "first_name": "John",
  "middle_name": "Robert",
  "last_name": "Doe",
  "telegram_username": "johndoe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_username": "johndoe",
  "met_at": "2024-01-10",
  "status_id": "uuid",
  "status": {
    "id": "uuid",
    "name": "New"
  },
  "notes": "Met at tech conference",
  "photo_path": null,
  "tags": [
    { "id": "uuid1", "name": "Developer" },
    { "id": "uuid2", "name": "Startup" }
  ],
  "interests": [
    { "id": "uuid1", "name": "Machine Learning" }
  ],
  "occupations": [
    { "id": "uuid1", "name": "Software Engineer" }
  ],
  "associations": [
    { "id": "uuid1", "first_name": "Jane", "last_name": "Smith" }
  ],
  "cluster_id": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

#### `GET /api/v1/contacts`

List contacts with optional filtering and pagination.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `page_size` | integer | Items per page (default: 20, max: 100) |
| `status_id` | uuid | Filter by status |
| `tag_ids` | uuid[] | Filter by tags (comma-separated) |
| `interest_ids` | uuid[] | Filter by interests (comma-separated) |
| `occupation_ids` | uuid[] | Filter by occupations (comma-separated) |
| `created_at_from` | date | Filter by creation date (from) |
| `created_at_to` | date | Filter by creation date (to) |
| `met_at_from` | date | Filter by met date (from) |
| `met_at_to` | date | Filter by met date (to) |
| `cluster_id` | integer | Filter by cluster |
| `search` | string | Search in names |
| `sort_by` | string | Sort field (default: created_at) |
| `sort_order` | string | asc or desc (default: desc) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "status": { "id": "uuid", "name": "Active" },
      "photo_url": "https://signed-url...",
      "tags": [{ "id": "uuid", "name": "Developer" }],
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

---

#### `GET /api/v1/contacts/{id}`

Get a single contact by ID.

**Authentication:** Required

**Response 200:** Full contact object (same as POST response)

**Response 404:**

```json
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with the specified ID was not found"
  }
}
```

---

#### `PATCH /api/v1/contacts/{id}`

Update a contact (partial update).

**Authentication:** Required

**Request Body:** (all fields optional)

```json
{
  "first_name": "Jonathan",
  "notes": "Updated notes",
  "tag_ids": ["uuid1", "uuid3"]
}
```

**Response 200:** Updated contact object

---

#### `DELETE /api/v1/contacts/{id}`

Delete a contact.

**Authentication:** Required

**Response 204:** No content

---

#### `POST /api/v1/contacts/{id}/photo`

Upload a contact photo.

**Authentication:** Required

**Request:** `multipart/form-data` with `photo` file field

**Constraints:**
- Max file size: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

**Response 200:**

```json
{
  "photo_path": "contacts/uuid/photo.jpg",
  "photo_url": "https://signed-url..."
}
```

---

#### `GET /api/v1/contacts/{id}/photo-url`

Get a signed URL for the contact's photo.

**Authentication:** Required

**Response 200:**

```json
{
  "photo_url": "https://signed-url...",
  "expires_at": "2024-01-15T10:35:00Z"
}
```

**Response 404:** If contact has no photo

---

### Statuses Endpoints

#### `GET /api/v1/statuses`

List all statuses.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include_inactive` | boolean | Include inactive statuses (default: false) |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "New",
      "sort_order": 1,
      "is_active": true,
      "contact_count": 25
    },
    {
      "id": "uuid",
      "name": "Active",
      "sort_order": 2,
      "is_active": true,
      "contact_count": 150
    }
  ]
}
```

---

#### `POST /api/v1/statuses`

Create a new status.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "VIP",
  "is_active": true
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "name": "VIP",
  "sort_order": 5,
  "is_active": true,
  "contact_count": 0
}
```

---

#### `PATCH /api/v1/statuses/{id}`

Update a status.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "Important",
  "is_active": false
}
```

**Response 200:** Updated status object

---

#### `POST /api/v1/statuses/reorder`

Reorder statuses.

**Authentication:** Required

**Request Body:**

```json
{
  "order": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

**Response 200:**

```json
{
  "message": "Statuses reordered successfully"
}
```

---

### Kanban Endpoints

#### `POST /api/v1/kanban/move`

Move a contact to a different status and/or position.

**Authentication:** Required

**Request Body:**

```json
{
  "contact_id": "uuid",
  "status_id": "uuid",
  "position": 3
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "status_id": "uuid",
  "sort_order_in_status": 3
}
```

---

### Suggestions Endpoints

#### `GET /api/v1/suggestions/tags`

Get tag suggestions for autocomplete.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (min 1 char) |
| `limit` | integer | Max results (default: 10) |

**Response 200:**

```json
{
  "data": [
    { "id": "uuid", "name": "Developer", "usage_count": 45 },
    { "id": "uuid", "name": "Designer", "usage_count": 23 }
  ]
}
```

---

#### `GET /api/v1/suggestions/interests`

Get interest suggestions. Same format as tags.

---

#### `GET /api/v1/suggestions/occupations`

Get occupation suggestions. Same format as tags.

---

### Graph Endpoints

#### `GET /api/v1/graph`

Get all contacts and associations for graph visualization.

**Authentication:** Required

**Response 200:**

```json
{
  "nodes": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "photo_url": "https://signed-url...",
      "cluster_id": 1,
      "position_x": 100,
      "position_y": 200
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "source_id": "contact-uuid-1",
      "target_id": "contact-uuid-2",
      "label": "Colleagues"
    }
  ],
  "clusters": [
    {
      "id": 1,
      "contact_count": 15,
      "color": "#3B82F6"
    }
  ]
}
```

---

#### `POST /api/v1/graph/edge`

Create an association between two contacts.

**Authentication:** Required

**Request Body:**

```json
{
  "source_id": "contact-uuid-1",
  "target_id": "contact-uuid-2",
  "label": "Met at conference"
}
```

**Response 201:**

```json
{
  "id": "uuid",
  "source_id": "contact-uuid-1",
  "target_id": "contact-uuid-2",
  "label": "Met at conference",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Response 409 (Duplicate):**

```json
{
  "error": {
    "code": "GRAPH_EDGE_EXISTS",
    "message": "An association between these contacts already exists"
  }
}
```

---

#### `DELETE /api/v1/graph/edge/{id}`

Delete an association.

**Authentication:** Required

**Response 204:** No content

---

#### `POST /api/v1/graph/clusters/recompute`

Recompute clusters using connected components algorithm.

**Authentication:** Required

**Response 200:**

```json
{
  "clusters_found": 5,
  "contacts_updated": 150,
  "algorithm": "connected_components"
}
```

---

## Data Models

### Python Pydantic Schemas (`backend/src/app/schemas/`)

#### Auth Schemas (`auth.py`)

```python
"""Authentication request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class BootstrapStatusResponse(BaseModel):
    """Response for bootstrap status check."""

    initialized: bool


class BootstrapRequest(BaseModel):
    """Request to create the owner account."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Request to authenticate."""

    email: EmailStr
    password: str


class LogoutRequest(BaseModel):
    """Request to logout."""

    refresh_token: str


class UserResponse(BaseModel):
    """User information response."""

    id: str
    email: str
    created_at: datetime | None = None


class AuthTokenResponse(BaseModel):
    """Authentication token response."""

    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    """Logout response."""

    message: str
```

#### Contact Schemas (`contact.py`)

```python
"""Contact request and response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, Field, HttpUrl


class TagBase(BaseModel):
    """Base tag schema."""

    id: str
    name: str


class TagWithCount(TagBase):
    """Tag with usage count."""

    usage_count: int = 0


class InterestBase(BaseModel):
    """Base interest schema."""

    id: str
    name: str


class OccupationBase(BaseModel):
    """Base occupation schema."""

    id: str
    name: str


class StatusBase(BaseModel):
    """Base status schema."""

    id: str
    name: str


class ContactAssociationBrief(BaseModel):
    """Brief contact info for associations."""

    id: str
    first_name: str
    last_name: str | None = None


class ContactCreateRequest(BaseModel):
    """Request to create a contact."""

    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    telegram_username: str | None = Field(default=None, max_length=100)
    linkedin_url: HttpUrl | None = None
    github_username: str | None = Field(default=None, max_length=100)
    met_at: date | None = None
    status_id: str | None = None
    notes: str | None = None
    tag_ids: list[str] = Field(default_factory=list)
    interest_ids: list[str] = Field(default_factory=list)
    occupation_ids: list[str] = Field(default_factory=list)
    association_contact_ids: list[str] = Field(default_factory=list)


class ContactUpdateRequest(BaseModel):
    """Request to update a contact (all fields optional)."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    telegram_username: str | None = Field(default=None, max_length=100)
    linkedin_url: HttpUrl | None = None
    github_username: str | None = Field(default=None, max_length=100)
    met_at: date | None = None
    status_id: str | None = None
    notes: str | None = None
    tag_ids: list[str] | None = None
    interest_ids: list[str] | None = None
    occupation_ids: list[str] | None = None
    association_contact_ids: list[str] | None = None


class ContactResponse(BaseModel):
    """Full contact response."""

    id: str
    first_name: str
    middle_name: str | None = None
    last_name: str | None = None
    telegram_username: str | None = None
    linkedin_url: str | None = None
    github_username: str | None = None
    met_at: date | None = None
    status_id: str | None = None
    status: StatusBase | None = None
    notes: str | None = None
    photo_path: str | None = None
    photo_url: str | None = None
    tags: list[TagBase] = Field(default_factory=list)
    interests: list[InterestBase] = Field(default_factory=list)
    occupations: list[OccupationBase] = Field(default_factory=list)
    associations: list[ContactAssociationBrief] = Field(default_factory=list)
    cluster_id: int | None = None
    sort_order_in_status: int = 0
    created_at: datetime
    updated_at: datetime


class ContactListItem(BaseModel):
    """Contact item for list view."""

    id: str
    first_name: str
    last_name: str | None = None
    status: StatusBase | None = None
    photo_url: str | None = None
    tags: list[TagBase] = Field(default_factory=list)
    created_at: datetime


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int
    page_size: int
    total_items: int
    total_pages: int


class ContactListResponse(BaseModel):
    """Paginated contact list response."""

    data: list[ContactListItem]
    pagination: PaginationMeta


class PhotoUploadResponse(BaseModel):
    """Response after photo upload."""

    photo_path: str
    photo_url: str


class PhotoUrlResponse(BaseModel):
    """Response with signed photo URL."""

    photo_url: str
    expires_at: datetime
```

#### Status Schemas (`status.py`)

```python
"""Status request and response schemas."""

from pydantic import BaseModel, Field


class StatusCreateRequest(BaseModel):
    """Request to create a status."""

    name: str = Field(min_length=1, max_length=50)
    is_active: bool = True


class StatusUpdateRequest(BaseModel):
    """Request to update a status."""

    name: str | None = Field(default=None, min_length=1, max_length=50)
    is_active: bool | None = None


class StatusReorderRequest(BaseModel):
    """Request to reorder statuses."""

    order: list[str]  # List of status IDs in desired order


class StatusResponse(BaseModel):
    """Status response."""

    id: str
    name: str
    sort_order: int
    is_active: bool
    contact_count: int = 0


class StatusListResponse(BaseModel):
    """Status list response."""

    data: list[StatusResponse]


class StatusReorderResponse(BaseModel):
    """Status reorder response."""

    message: str
```

#### Kanban Schemas (`kanban.py`)

```python
"""Kanban request and response schemas."""

from pydantic import BaseModel, Field


class KanbanMoveRequest(BaseModel):
    """Request to move a contact in Kanban."""

    contact_id: str
    status_id: str
    position: int = Field(ge=0)


class KanbanMoveResponse(BaseModel):
    """Response after moving a contact."""

    id: str
    status_id: str
    sort_order_in_status: int
```

#### Suggestion Schemas (`suggestion.py`)

```python
"""Suggestion schemas for autocomplete."""

from pydantic import BaseModel


class SuggestionItem(BaseModel):
    """Single suggestion item."""

    id: str
    name: str
    usage_count: int = 0


class SuggestionListResponse(BaseModel):
    """Suggestion list response."""

    data: list[SuggestionItem]
```

#### Graph Schemas (`graph.py`)

```python
"""Graph request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """Node in the graph (contact)."""

    id: str
    first_name: str
    last_name: str | None = None
    photo_url: str | None = None
    cluster_id: int | None = None
    position_x: float | None = None
    position_y: float | None = None


class GraphEdge(BaseModel):
    """Edge in the graph (association)."""

    id: str
    source_id: str
    target_id: str
    label: str | None = None


class GraphCluster(BaseModel):
    """Cluster information."""

    id: int
    contact_count: int
    color: str


class GraphResponse(BaseModel):
    """Full graph response."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    clusters: list[GraphCluster]


class EdgeCreateRequest(BaseModel):
    """Request to create an edge."""

    source_id: str
    target_id: str
    label: str | None = Field(default=None, max_length=100)


class EdgeResponse(BaseModel):
    """Edge response."""

    id: str
    source_id: str
    target_id: str
    label: str | None = None
    created_at: datetime


class ClusterRecomputeResponse(BaseModel):
    """Response after cluster recomputation."""

    clusters_found: int
    contacts_updated: int
    algorithm: str = "connected_components"
```

---

### TypeScript Interfaces (`frontend/src/types/`)

#### API Types (`api.ts`)

```typescript
/**
 * Standard API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Generic list response
 */
export interface ListResponse<T> {
  data: T[];
}
```

#### Auth Types (`auth.ts`)

```typescript
/**
 * Bootstrap status response
 */
export interface BootstrapStatusResponse {
  initialized: boolean;
}

/**
 * Bootstrap/Login request
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Logout request
 */
export interface LogoutRequest {
  refresh_token: string;
}

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  created_at?: string;
}

/**
 * Authentication token response
 */
export interface AuthTokenResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  message: string;
}
```

#### Contact Types (`contact.ts`)

```typescript
/**
 * Base tag
 */
export interface Tag {
  id: string;
  name: string;
}

/**
 * Tag with usage count
 */
export interface TagWithCount extends Tag {
  usage_count: number;
}

/**
 * Base interest
 */
export interface Interest {
  id: string;
  name: string;
}

/**
 * Base occupation
 */
export interface Occupation {
  id: string;
  name: string;
}

/**
 * Base status
 */
export interface Status {
  id: string;
  name: string;
}

/**
 * Status with full details
 */
export interface StatusFull extends Status {
  sort_order: number;
  is_active: boolean;
  contact_count: number;
}

/**
 * Brief contact info for associations
 */
export interface ContactAssociationBrief {
  id: string;
  first_name: string;
  last_name: string | null;
}

/**
 * Contact creation request
 */
export interface ContactCreateRequest {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
  linkedin_url?: string | null;
  github_username?: string | null;
  met_at?: string | null; // ISO date string
  status_id?: string | null;
  notes?: string | null;
  tag_ids?: string[];
  interest_ids?: string[];
  occupation_ids?: string[];
  association_contact_ids?: string[];
}

/**
 * Contact update request (partial)
 */
export interface ContactUpdateRequest {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
  linkedin_url?: string | null;
  github_username?: string | null;
  met_at?: string | null;
  status_id?: string | null;
  notes?: string | null;
  tag_ids?: string[];
  interest_ids?: string[];
  occupation_ids?: string[];
  association_contact_ids?: string[];
}

/**
 * Full contact response
 */
export interface Contact {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  telegram_username: string | null;
  linkedin_url: string | null;
  github_username: string | null;
  met_at: string | null;
  status_id: string | null;
  status: Status | null;
  notes: string | null;
  photo_path: string | null;
  photo_url: string | null;
  tags: Tag[];
  interests: Interest[];
  occupations: Occupation[];
  associations: ContactAssociationBrief[];
  cluster_id: number | null;
  sort_order_in_status: number;
  created_at: string;
  updated_at: string;
}

/**
 * Contact list item (abbreviated)
 */
export interface ContactListItem {
  id: string;
  first_name: string;
  last_name: string | null;
  status: Status | null;
  photo_url: string | null;
  tags: Tag[];
  created_at: string;
}

/**
 * Photo upload response
 */
export interface PhotoUploadResponse {
  photo_path: string;
  photo_url: string;
}

/**
 * Photo URL response
 */
export interface PhotoUrlResponse {
  photo_url: string;
  expires_at: string;
}

/**
 * Contact list query parameters
 */
export interface ContactListParams {
  page?: number;
  page_size?: number;
  status_id?: string;
  tag_ids?: string[];
  interest_ids?: string[];
  occupation_ids?: string[];
  created_at_from?: string;
  created_at_to?: string;
  met_at_from?: string;
  met_at_to?: string;
  cluster_id?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
```

#### Status Types (`status.ts`)

```typescript
import type { StatusFull } from './contact';
import type { ListResponse } from './api';

/**
 * Status creation request
 */
export interface StatusCreateRequest {
  name: string;
  is_active?: boolean;
}

/**
 * Status update request
 */
export interface StatusUpdateRequest {
  name?: string;
  is_active?: boolean;
}

/**
 * Status reorder request
 */
export interface StatusReorderRequest {
  order: string[];
}

/**
 * Status list response
 */
export type StatusListResponse = ListResponse<StatusFull>;

/**
 * Status reorder response
 */
export interface StatusReorderResponse {
  message: string;
}
```

#### Kanban Types (`kanban.ts`)

```typescript
/**
 * Kanban move request
 */
export interface KanbanMoveRequest {
  contact_id: string;
  status_id: string;
  position: number;
}

/**
 * Kanban move response
 */
export interface KanbanMoveResponse {
  id: string;
  status_id: string;
  sort_order_in_status: number;
}
```

#### Graph Types (`graph.ts`)

```typescript
/**
 * Graph node (contact)
 */
export interface GraphNode {
  id: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  cluster_id: number | null;
  position_x: number | null;
  position_y: number | null;
}

/**
 * Graph edge (association)
 */
export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  label: string | null;
}

/**
 * Graph cluster
 */
export interface GraphCluster {
  id: number;
  contact_count: number;
  color: string;
}

/**
 * Full graph response
 */
export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

/**
 * Edge creation request
 */
export interface EdgeCreateRequest {
  source_id: string;
  target_id: string;
  label?: string | null;
}

/**
 * Edge response
 */
export interface EdgeResponse {
  id: string;
  source_id: string;
  target_id: string;
  label: string | null;
  created_at: string;
}

/**
 * Cluster recompute response
 */
export interface ClusterRecomputeResponse {
  clusters_found: number;
  contacts_updated: number;
  algorithm: string;
}
```

#### Suggestion Types (`suggestion.ts`)

```typescript
import type { ListResponse } from './api';

/**
 * Suggestion item
 */
export interface SuggestionItem {
  id: string;
  name: string;
  usage_count: number;
}

/**
 * Suggestion list response
 */
export type SuggestionListResponse = ListResponse<SuggestionItem>;

/**
 * Suggestion query parameters
 */
export interface SuggestionParams {
  q: string;
  limit?: number;
}
```

#### Index Re-export (`index.ts`)

```typescript
export * from './api';
export * from './auth';
export * from './contact';
export * from './status';
export * from './kanban';
export * from './graph';
export * from './suggestion';
```

---

## Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_ALREADY_INITIALIZED` | 409 | Bootstrap attempted on initialized app |
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT has expired |
| `AUTH_TOKEN_INVALID` | 401 | JWT is malformed or invalid |
| `AUTH_UNAUTHORIZED` | 401 | No authentication provided |
| `AUTH_FORBIDDEN` | 403 | User is not the app owner |
| `CONTACT_NOT_FOUND` | 404 | Contact ID does not exist |
| `STATUS_NOT_FOUND` | 404 | Status ID does not exist |
| `GRAPH_EDGE_EXISTS` | 409 | Association already exists |
| `GRAPH_EDGE_NOT_FOUND` | 404 | Edge ID does not exist |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds limit |
| `FILE_TYPE_INVALID` | 415 | Unsupported file type |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Validation Error Details

For validation errors, the `details` field contains field-specific errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Must be at least 8 characters"
    }
  }
}
```

---

## Authentication Flow

### Token Storage (Frontend)

- **Access Token**: Stored in memory (React state/context)
- **Refresh Token**: Stored in `localStorage` (for persistence across page reloads)

### Token Refresh Strategy

1. Access token expires after 30 minutes
2. Frontend intercepts 401 responses
3. Frontend attempts to refresh using stored refresh token
4. On success, retry original request with new access token
5. On failure, redirect to login page

### Request Authentication

All protected requests include:

```
Authorization: Bearer <access_token>
```

### Backend JWT Verification

1. Extract JWT from `Authorization` header
2. Verify signature using `SUPABASE_JWT_SECRET`
3. Check token expiration
4. Extract `sub` claim (user ID)
5. Verify user ID matches `app_owner.supabase_user_id`
6. If any check fails, return appropriate error

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | ^0.115 | Web framework |
| uv | latest | Package manager |
| pydantic | ^2.0 | Data validation |
| pydantic-settings | ^2.0 | Configuration |
| ruff | latest | Linting & formatting |
| PyJWT | ^2.8 | JWT handling |
| supabase | ^2.0 | Supabase client |
| uvicorn | ^0.30 | ASGI server |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.3 | UI framework |
| TypeScript | ^5.5 | Type safety |
| Vite | ^5.4 | Build tool |
| TanStack Query | ^5.50 | Server state |
| React Router | ^6.26 | Routing |
| @dnd-kit/core | ^6.1 | Drag and drop |
| @dnd-kit/sortable | ^8.0 | Sortable lists |
| @xyflow/react | ^12.0 | Graph visualization |
| Nginx | 1.27 | Static file server |

### Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24+ | Containerization |
| Docker Compose | 2.20+ | Orchestration |
| GitHub Actions | - | CI/CD |
| Supabase | - | Backend services |

---

## Database Schema

### SQL Migrations

The following tables are created via Supabase migrations:

```sql
-- app_owner: Single-row constraint for owner identity
CREATE TABLE app_owner (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    supabase_user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- statuses: Kanban columns
CREATE TABLE statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contacts: Main contact table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT,
    telegram_username TEXT,
    linkedin_url TEXT,
    github_username TEXT,
    met_at DATE,
    status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
    notes TEXT,
    photo_path TEXT,
    cluster_id INTEGER,
    sort_order_in_status INTEGER NOT NULL DEFAULT 0,
    position_x FLOAT,
    position_y FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup tables
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE occupations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Join tables
CREATE TABLE contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE contact_interests (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, interest_id)
);

CREATE TABLE contact_occupations (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    occupation_id UUID NOT NULL REFERENCES occupations(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, occupation_id)
);

-- Association graph (edges)
CREATE TABLE contact_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    target_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_contact_id, target_contact_id),
    CHECK (source_contact_id != target_contact_id)
);

-- Indexes
CREATE INDEX idx_contacts_status_id ON contacts(status_id);
CREATE INDEX idx_contacts_cluster_id ON contacts(cluster_id);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);
CREATE INDEX idx_contacts_met_at ON contacts(met_at);
CREATE INDEX idx_contact_associations_source ON contact_associations(source_contact_id);
CREATE INDEX idx_contact_associations_target ON contact_associations(target_contact_id);
```

### Default Status Seed

```sql
INSERT INTO statuses (name, sort_order, is_active) VALUES
    ('New', 1, TRUE),
    ('Active', 2, TRUE),
    ('Inactive', 3, TRUE),
    ('Archived', 4, TRUE);
```

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2024-01-15 | RepoArchitect | Initial specification |

---

**This document is the authoritative source for all implementation decisions. All implementing agents must conform to these specifications.**
