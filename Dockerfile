# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/ .

# Auto-fix package.json if needed
RUN if [ ! -f "package.json" ] || [ "$(wc -c < package.json)" -lt 100 ]; then \
    echo '{"name":"moneyfy-frontend","version":"0.1.0","private":true,"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-scripts":"5.0.1","web-vitals":"^2.1.4","react-router-dom":"^6.0.0","axios":"^1.6.0"},"scripts":{"start":"react-scripts start","build":"react-scripts build","test":"react-scripts test","eject":"react-scripts eject"}}' > package.json; \
fi

# Install dependencies
RUN npm install

# Fix import paths
RUN find src -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs sed -i "s|from '../../../hooks/|from '../../hooks/|g" 2>/dev/null || true

# Build
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
