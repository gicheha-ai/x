# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ .

# Fix import paths
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|from '../../../hooks/|from '../../hooks/|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { AuthProvider } from|import AuthProvider from|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { ProductProvider } from|import ProductProvider from|g" 2>/dev/null || true
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i "s|import { CartProvider } from|import CartProvider from|g" 2>/dev/null || true

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Use default nginx config (already includes SPA routing)
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
