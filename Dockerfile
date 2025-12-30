FROM node:18-alpine AS builder
WORKDIR /app

# Copy frontend
COPY frontend/ .

# Overwrite package.json
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

# NUCLEAR OPTION: MOVE HOOKS OUT OF SRC/ entirely
RUN if [ -d "src/hooks" ]; then \
    echo "Moving hooks out of src/..."; \
    mkdir -p hooks; \
    mv src/hooks/* hooks/; \
    rmdir src/hooks; \
    # Update ALL imports to point to the new location \
    find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from ['\"][^'\"]*/hooks/|from '../../hooks/|g" 2>/dev/null || true; \
fi

# Also copy hooks to node_modules for CRA
RUN if [ -d "hooks" ]; then \
    echo "Copying hooks to node_modules..."; \
    mkdir -p node_modules/hooks; \
    cp -r hooks/* node_modules/hooks/ 2>/dev/null || true; \
fi

# Simple fix for Provider imports
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { AuthContext } from|import { AuthContext } from './context/AuthContext/AuthContext'|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import AuthProvider from|import AuthProvider from './context/AuthContext/AuthProvider'|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { ProductContext } from|import { ProductContext } from './context/ProductContext/ProductContext'|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import ProductProvider from|import ProductProvider from './context/ProductContext/ProductProvider'|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { CartContext } from|import { CartContext } from './context/CartContext/CartContext'|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import CartProvider from|import CartProvider from './context/CartContext/CartProvider'|g" 2>/dev/null || true

# Show structure
RUN echo "=== Structure ===" && \
    find . -name "*hook*" -o -name "*Hook*" | head -10 && \
    ls -la hooks/ 2>/dev/null || echo "No hooks folder" && \
    ls -la node_modules/hooks/ 2>/dev/null || echo "No hooks in node_modules"

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
