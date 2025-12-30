FROM node:18-alpine AS builder
WORKDIR /app

# 1. Copy frontend
COPY frontend/ .

# 2. Create proper package.json
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

# 3. Install
RUN npm install

# 4. CRITICAL: Copy hooks to the EXACT location imports expect
# Imports like ../../../hooks/ expect hooks to be 3 levels up from src/
# So we need hooks at the BUILD CONTEXT root (outside src/)
RUN if [ -d "src/hooks" ]; then \
    echo "Copying hooks to build context root..."; \
    mkdir -p hooks; \
    cp -r src/hooks/* hooks/; \
fi

# 5. Also copy to node_modules/hooks as backup
RUN if [ -d "src/hooks" ]; then \
    echo "Copying hooks to node_modules..."; \
    mkdir -p node_modules/hooks; \
    cp -r src/hooks/* node_modules/hooks/; \
fi

# 6. Verify structure
RUN echo "=== Current structure ===" && \
    find . -name "hooks" -type d | xargs -I {} sh -c 'echo "Directory: {}"; ls -la {}' && \
    echo "========================"

# 7. Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
