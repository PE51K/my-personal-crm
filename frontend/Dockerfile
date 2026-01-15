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

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper ownership (nginx runs as nginx user)
RUN chown -R nginx:nginx /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Use nginx's default CMD
CMD ["nginx", "-g", "daemon off;"]
