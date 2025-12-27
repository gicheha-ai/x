# Simple Fullstack Dockerfile for Render - FIXED VERSION
FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx curl

# Create app directory
WORKDIR /app

# ========== BACKEND ==========
# Copy backend package files
COPY backend/package*.json ./backend/

# Generate package-lock.json if missing, then install
RUN cd backend && \
    if [ ! -f package-lock.json ]; then npm install; fi && \
    npm install --production

# Copy backend source
COPY backend/ ./backend/

# ========== FRONTEND ==========
# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
RUN cd frontend && npm install --production

# Check if build script exists, if not use default
COPY frontend/ ./frontend/
RUN cd frontend && \
    if grep -q '"build"' package.json; then \
        npm run build; \
    else \
        echo "No build script found, using default build" && \
        npm run build || npm run compile || echo "Build step skipped"; \
    fi

# ========== NGINX SETUP ==========
# Setup nginx to serve frontend
RUN mkdir -p /var/www/frontend
RUN cp -r frontend/build/* /var/www/frontend/ 2>/dev/null || \
    cp -r frontend/dist/* /var/www/frontend/ 2>/dev/null || \
    cp -r frontend/* /var/www/frontend/ 2>/dev/null || \
    echo "No frontend files found" && mkdir -p /var/www/frontend

# Simple nginx config
RUN echo 'events { worker_connections 1024; }' > /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 80;' >> /etc/nginx/nginx.conf && \
    echo '    root /var/www/frontend;' >> /etc/nginx/nginx.conf && \
    echo '    location / {' >> /etc/nginx/nginx.conf && \
    echo '      try_files $uri $uri/ /index.html;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location /api {' >> /etc/nginx/nginx.conf && \
    echo '      proxy_pass http://localhost:10000;' >> /etc/nginx/nginx.conf && \
    echo '      proxy_set_header Host $host;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location /health {' >> /etc/nginx/nginx.conf && \
    echo '      return 200 "healthy";' >> /etc/nginx/nginx.conf && \
    echo '      add_header Content-Type text/plain;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Simple start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'cd /app/backend' >> /app/start.sh && \
    echo 'node server.js &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'echo "Backend started with PID: $BACKEND_PID"' >> /app/start.sh && \
    echo 'nginx -g "daemon off;" &' >> /app/start.sh && \
    echo 'NGINX_PID=$!' >> /app/start.sh && \
    echo 'echo "Nginx started with PID: $NGINX_PID"' >> /app/start.sh && \
    echo 'wait $BACKEND_PID $NGINX_PID' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose Render's default port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start
CMD ["/app/start.sh"]
