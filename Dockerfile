FROM node:18-alpine AS builder
WORKDIR /app

# Copy frontend
COPY frontend/ .

# Fix package.json
RUN echo '{"name":"moneyfy-frontend","version":"0.1.0","private":true,"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-scripts":"5.0.1","web-vitals":"^2.1.4","react-router-dom":"^6.0.0","axios":"^1.6.0"},"scripts":{"start":"react-scripts start","build":"react-scripts build","test":"react-scripts test","eject":"react-scripts eject"}}' > package.json

# Install
RUN npm install

# NUCLEAR OPTION: Create hook files at EVERY possible location
RUN if [ -d "src/hooks" ]; then \
    echo "Creating hooks at all possible locations..."; \
    # Location 1: node_modules/hooks (as error suggests) \
    mkdir -p node_modules/hooks && cp -r src/hooks/* node_modules/hooks/ 2>/dev/null || true; \
    # Location 2: At root (for ../../../hooks/) \
    cp -r src/hooks/* ./ 2>/dev/null || true; \
    # Location 3: One level up \
    mkdir -p ../hooks && cp -r src/hooks/* ../hooks/ 2>/dev/null || true; \
    # Location 4: Two levels up \
    mkdir -p ../../hooks && cp -r src/hooks/* ../../hooks/ 2>/dev/null || true; \
    # Also fix the actual import paths in source files \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from '../../../hooks/|from '../../hooks/|g" 2>/dev/null || true; \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { AuthProvider } from|import AuthProvider from|g" 2>/dev/null || true; \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { ProductProvider } from|import ProductProvider from|g" 2>/dev/null || true; \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { SuperAdminProvider } from|import SuperAdminProvider from|g" 2>/dev/null || true; \
fi

# Show what we have
RUN echo "=== Hook files ===" && \
    find . -name "*.js" -path "*/hooks/*" | head -10 && \
    echo "=== Structure ===" && \
    ls -la hooks/ 2>/dev/null || echo "No hooks at root" && \
    ls -la node_modules/hooks/ 2>/dev/null || echo "No hooks in node_modules"

# Build
RUN npm run build || (echo "Build failed, showing errors..." && cat /app/build.log 2>/dev/null && exit 1)

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
