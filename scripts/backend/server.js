const app = require('./app');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const redis = require('./config/redis');
const logger = require('./utils/logger');

// Import socket initialization
const { initializeSocket } = require('./socket');

// Load environment variables
require('dotenv').config();

// Get port from environment
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize socket handlers
initializeSocket(io);

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
    });
    
    // Close Socket.IO
    io.close(() => {
      logger.info('Socket.IO closed');
    });
    
    // Close database connections
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    await redis.quit();
    logger.info('Redis connection closed');
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║  🚀 E-Commerce Pro Platform Backend Started!              ║
    ║                                                           ║
    ╠═══════════════════════════════════════════════════════════╣
    ║                                                           ║
    ║  Environment: ${NODE_ENV.padEnd(30)} ║
    ║  Port: ${PORT.toString().padEnd(33)} ║
    ║  API Version: ${process.env.API_VERSION || 'v1'.padEnd(27)} ║
    ║  URL: http://localhost:${PORT.toString().padEnd(28)} ║
    ║                                                           ║
    ║  📊 Super Admin Features:                                 ║
    ║  • Email: ${process.env.SUPER_ADMIN_EMAIL.padEnd(27)} ║
    ║  • Mobile: ${process.env.SUPER_ADMIN_MOBILE.padEnd(28)} ║
    ║  • Revenue Dashboard: /api/v1/revenue/dashboard           ║
    ║  • Link Generator: /api/v1/links/generate                ║
    ║                                                           ║
    ║  🔒 Security:                                             ║
    ║  • JWT Authentication Enabled                             ║
    ║  • Rate Limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || '100'}/15min ║
    ║  • CORS Origin: ${process.env.CORS_ORIGIN || 'localhost:3000'.padEnd(21)} ║
    ║                                                           ║
    ║  💰 Payment Methods:                                      ║
    ║  • Airtel Money (Primary: ${process.env.SUPER_ADMIN_MOBILE}) ║
    ║  • Stripe                                                 ║
    ║  • PayPal                                                 ║
    ║  • Bank Transfer                                          ║
    ║                                                           ║
    ║  📈 Revenue Streams:                                      ║
    ║  • Boost Sales: $10/$50/$150                              ║
    ║  • Transaction Fees: ${process.env.TRANSACTION_FEE_PERCENTAGE || '8'}%         ║
    ║  • Affiliate Commission: ${process.env.AFFILIATE_COMMISSION_RATE || '20'}%     ║
    ║  • Subscriptions: $0/$29/$99                              ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Log database connection status
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  logger.info(`Database: ${states[dbState]}`);
  
  // Log Redis connection status
  redis.ping().then(() => {
    logger.info('Redis: connected');
  }).catch(err => {
    logger.error('Redis: connection failed', err);
  });
});

// Export for testing
module.exports = { app, server, io };