# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/ .

# Auto-fix package.json if needed with ALL required dependencies
RUN if [ ! -f "package.json" ] || [ "$(wc -c < package.json)" -lt 100 ]; then \
    echo '{"name":"moneyfy-frontend","version":"0.1.0","private":true,"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-scripts":"5.0.1","web-vitals":"^2.1.4","react-router-dom":"^6.0.0","axios":"^1.6.0","bootstrap":"^5.3.0","react-bootstrap":"^2.9.0"},"scripts":{"start":"react-scripts start","build":"react-scripts build","test":"react-scripts test","eject":"react-scripts eject"}}' > package.json; \
fi

# Install dependencies
RUN npm install

# Fix import paths for hooks (../../../hooks/ to ../../hooks/)
RUN find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
    -exec sed -i "s|from '../../../hooks/|from '../../hooks/|g" {} + 2>/dev/null || true

# Fix ALL Provider imports (change named imports to default imports)
RUN for provider in AuthProvider ProductProvider CartProvider OrderProvider UserProvider; do \
    if find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec grep -l "import.*{$provider}" {} + >/dev/null 2>&1; then \
      find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
        -exec sed -i "s|import { $provider } from|import $provider from|g" {} + 2>/dev/null || true; \
    fi; \
  done

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx configuration for React SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
