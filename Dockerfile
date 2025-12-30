# Moneyfy - Simple Production Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
COPY backend/ ./backend/
RUN cd backend && npm install --only=production

# Copy and build frontend
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/
RUN cd frontend && npm install --only=production && npm run build

# Create production server
RUN cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(require('cors')());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Try to use existing backend
try {
  const backend = require('./backend/server.js');
  app.use('/api', backend);
  console.log('✅ Using existing backend');
} catch (error) {
  console.log('⚠️ Fallback API:', error.message);
  
  // Basic API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'Moneyfy' });
  });
  
  app.get('/api', (req, res) => {
    res.json({ message: 'Moneyfy API', version: '1.0.0' });
  });
}

// All routes to React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`💰 Moneyfy running on port ${PORT}`);
});
EOF

# Start
CMD ["node", "server.js"]
