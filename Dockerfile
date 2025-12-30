FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything
COPY frontend/ .

# CRITICAL: Copy hooks to node_modules/hooks BEFORE npm install
RUN if [ -d "hooks" ]; then \
    echo "Copying hooks to node_modules/hooks..."; \
    mkdir -p node_modules/hooks; \
    cp -r hooks/* node_modules/hooks/; \
    echo "✓ Hooks copied to node_modules"; \
else \
    echo "No hooks directory found"; \
    find . -name "*hook*" -type f | head -5; \
fi

# Also fix import paths in source code
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from ['\"]../../../hooks/|from 'hooks/'|g" 2>/dev/null || true

RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
