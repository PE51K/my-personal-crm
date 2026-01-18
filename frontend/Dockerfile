# =============================================================================
# Frontend Dockerfile - React + Vite with Nginx
# =============================================================================
# Multi-stage build:
# - Stage 1: Build React application with Node.js
# - Stage 2: Serve static assets with Nginx
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build the React application
# -----------------------------------------------------------------------------
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Accept build-time environment variables for Vite
ARG VITE_API_BASE_URL=/api

# Set environment variables for the build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies with npm ci for reproducible builds
RUN npm ci --prefer-offline

# Copy the rest of the application source
COPY . .

# Build the application for production
# Vite outputs to /app/dist by default
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Runtime - Serve with Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Install curl for healthcheck and envsubst for environment variable substitution
RUN apk add --no-cache curl gettext

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration template
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper ownership (nginx runs as nginx user)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Nginx will automatically process .template files in /etc/nginx/templates/
# and substitute environment variables using envsubst
# Default port is set here, can be overridden via docker-compose environment
ENV FRONTEND_PORT=3000

# Expose the default port (actual port is set by FRONTEND_PORT env var)
EXPOSE 3000

# Use nginx's default CMD (it will process templates automatically)
CMD ["nginx", "-g", "daemon off;"]
