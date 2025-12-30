FROM node:18-alpine AS builder
WORKDIR /app

# Copy frontend
COPY frontend/ .

# Fix package.json
RUN cat > package.json << 'EOF'
{
  "name": "moneyfy-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4",
    "react-router-dom": "^6.0.0",
    "axios": "^1.6.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
EOF

RUN npm install

# FIX: Remove semicolons from inside import strings
RUN echo "Fixing import paths with stray semicolons..." && \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from '\([^']*\);'|from '\1'|g" 2>/dev/null || true && \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from \"\([^\"]*\);\"|from \"\1\"|g" 2>/dev/null || true

# Also fix other common issues
RUN echo "Fixing other import issues..." && \
    # Fix hook imports \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from ['\"][^'\"]*/hooks/|from '../../hooks/|g" 2>/dev/null || true && \
    # Fix AuthProvider imports \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import AuthProvider from ['\"][^'\"]*AuthProvider[^'\"]*['\"]|import AuthProvider from './context/AuthContext/AuthProvider'|g" 2>/dev/null || true

# Show problematic lines
RUN echo "=== Checking for problematic imports ===" && \
    find src -name "*.js" -o -name "*.jsx" -exec grep -l "AuthProvider;" {} + 2>/dev/null | while read file; do \
        echo "File: $file"; \
        grep -n "AuthProvider;" "$file" | head -5; \
    done

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
