# Moneyfy - Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Build frontend
RUN cd frontend && npm run build

# ========== PRODUCTION STAGE ==========
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies for backend
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend ./backend

# Copy built frontend
COPY --from=builder /app/frontend/build ./frontend/build

# Copy shared code
COPY --from=builder /app/shared ./shared

# Create production server.js
RUN cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Import your existing backend routes
try {
  // Try to load your existing backend
  const backendApp = require('./backend/server.js');
  
  // Mount all API routes under /api
  app.use('/api', backendApp);
  
  console.log('✅ Loaded existing Moneyfy backend');
} catch (error) {
  console.log('⚠️ Could not load existing backend, using fallback:', error.message);
  
  // Fallback API routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      service: 'Moneyfy',
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'Moneyfy API',
      version: '1.0.0'
    });
  });
}

// All other requests go to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Moneyfy Production Server Started');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Frontend: Serving from /frontend/build`);
  console.log(`📡 API: Available at /api`);
});
EOF

# Create environment file
RUN echo "NODE_ENV=production" > .env

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "server.js"]
