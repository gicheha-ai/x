FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/ .

# Move hooks to where imports expect them (at build root)
RUN if [ -d "hooks" ]; then \
    echo "Hooks found at project root"; \
    # Copy hooks to node_modules as CRA suggests \
    mkdir -p node_modules/hooks; \
    cp -r hooks/* node_modules/hooks/; \
    # Also create at root for ../../../ imports \
    mkdir -p ../../hooks; \
    cp -r hooks/* ../../hooks/ 2>/dev/null || true; \
else \
    echo "No hooks folder found"; \
fi

RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
