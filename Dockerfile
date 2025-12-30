FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything
COPY frontend/ .

# Copy hooks to node_modules
RUN if [ -d "hooks" ]; then \
    mkdir -p node_modules/hooks; \
    cp -r hooks/* node_modules/hooks/; \
    echo "✓ Hooks copied to node_modules"; \
fi

# Install dependencies
RUN npm install

# Build with warnings allowed
RUN CI=false npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
