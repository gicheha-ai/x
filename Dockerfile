# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the frontend source code
COPY frontend/ .

# Build the application (adjust build command as needed)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config if you have one
# COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
