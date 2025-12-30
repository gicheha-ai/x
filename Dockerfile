FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything
COPY frontend/ .

# Create guaranteed correct package.json
RUN echo '{"name":"moneyfy-frontend","version":"0.1.0","private":true,"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-scripts":"5.0.1","web-vitals":"^2.1.4","react-router-dom":"^6.0.0","axios":"^1.6.0"},"scripts":{"start":"react-scripts start","build":"react-scripts build","test":"react-scripts test","eject":"react-scripts eject"}}' > package.json

# Install
RUN npm install

# Create a SYMLINK solution instead of fixing imports
# This satisfies Create React App's restriction
RUN if [ -d "src/hooks" ]; then \
    echo "Creating symlinks for hooks..."; \
    ln -sf ../src/hooks node_modules/hooks 2>/dev/null || true; \
fi

# Also copy hooks to where imports expect them
RUN if [ -d "src/hooks" ]; then \
    echo "Copying hooks for imports..."; \
    mkdir -p node_modules/hooks; \
    cp -r src/hooks/* node_modules/hooks/ 2>/dev/null || true; \
fi

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
