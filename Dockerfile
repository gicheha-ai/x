# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies (using npm install instead of ci)
RUN npm install --production

# Copy the rest of the frontend source code
COPY frontend/ .

# Build the application (adjust build command as needed)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
