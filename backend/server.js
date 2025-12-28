// backend/server.js - WORKING VERSION
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Moneyfy Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Main API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Moneyfy API is running successfully!',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/products',
      '/api/cart',
      '/api/orders'
    ]
  });
});

// Products endpoint
app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Premium Widget', price: 29.99, category: 'Electronics' },
    { id: 2, name: 'Deluxe Gadget', price: 49.99, category: 'Electronics' },
    { id: 3, name: 'Basic Tool', price: 19.99, category: 'Tools' }
  ]);
});

// Cart endpoint
app.post('/api/cart', (req, res) => {
  res.json({ 
    message: 'Item added to cart',
    cart: req.body 
  });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Moneyfy backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🌐 API: http://0.0.0.0:${PORT}/api`);
});
