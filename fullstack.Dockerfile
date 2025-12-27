# Working Fullstack Dockerfile
FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx

# Set working directory
WORKDIR /app

# ========== BACKEND ==========
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/

# ========== FRONTEND ==========
COPY frontend/package*.json ./frontend/

# Install frontend dependencies with specific versions
RUN cd frontend && \
    npm install --omit=dev \
    react@^18.2.0 \
    react-dom@^18.2.0 \
    react-scripts@5.0.1 \
    web-vitals@^3.5.0

COPY frontend/ ./frontend/

# Build frontend with specific env
RUN cd frontend && CI=false SKIP_PREFLIGHT_CHECK=true npm run build

# ========== NGINX SETUP ==========
RUN mkdir -p /var/www/html
RUN cp -r frontend/build/* /var/www/html/

# Simple nginx config
RUN echo 'events {}' > /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 80;' >> /etc/nginx/nginx.conf && \
    echo '    root /var/www/html;' >> /etc/nginx/nginx.conf && \
    echo '    location / {' >> /etc/nginx/nginx.conf && \
    echo '      try_files $uri $uri/ /index.html;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location /api {' >> /etc/nginx/nginx.conf && \
    echo '      proxy_pass http://localhost:10000;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create start script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting backend..."' >> /app/start.sh && \
    echo 'cd /app/backend' >> /app/start.sh && \
    echo 'node server.js &' >> /app/start.sh && \
    echo 'echo "Starting nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/api/health || exit 1

# Start
CMD ["/app/start.sh"]
