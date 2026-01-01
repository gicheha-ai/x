# Multi-stage build for production
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend (if needed)
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Stage 3: Production
FROM node:18-alpine

WORKDIR /app

# Install system dependencies if needed (for some packages like bcrypt, sharp, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files for root (if using monorepo)
COPY package*.json ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --only=production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose the port Render expects
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {if(r.statusCode !== 200) throw new Error()})" || exit 1

# Start the application
CMD ["node", "backend/server.js"]
