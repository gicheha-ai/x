// backend/server.js - Updated for production
const express = require('express');
const app = express();

// Your existing middleware
app.use(require('cors')());
app.use(express.json());

// Your existing routes
app.use('/auth', require('./src/routes/auth'));
app.use('/transactions', require('./src/routes/transactions'));
app.use('/budgets', require('./src/routes/budgets'));
// ... other routes

// Health check (important for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Moneyfy Backend' });
});

// Export the app (important for Dockerfile)
module.exports = app;

// Only start server if running directly (not imported)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}
