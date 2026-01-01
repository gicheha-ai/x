const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cookieParser = require('cookie-parser');
const useragent = require('express-useragent');

// Import middleware
const errorMiddleware = require('./middleware/errorMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const linkRoutes = require('./routes/linkRoutes');
const boostRoutes = require('./routes/boostRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const searchRoutes = require('./routes/searchRoutes');

// Import socket.io
const { initializeSocket } = require('./socket');

// Import database connection
const connectDB = require('./config/database');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.paypal.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp({
  whitelist: [
    'price',
    'rating',
    'category',
    'sort',
    'limit',
    'page'
  ]
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(loggerMiddleware);

// User agent parsing
app.use(useragent.express());

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';
const basePath = `/api/${apiVersion}`;

app.use(`${basePath}/auth`, authRoutes);
app.use(`${basePath}/users`, userRoutes);
app.use(`${basePath}/products`, productRoutes);
app.use(`${basePath}/orders`, orderRoutes);
app.use(`${basePath}/payments`, paymentRoutes);
app.use(`${basePath}/revenue`, revenueRoutes);
app.use(`${basePath}/links`, linkRoutes);
app.use(`${basePath}/boost`, boostRoutes);
app.use(`${basePath}/affiliate`, affiliateRoutes);
app.use(`${basePath}/categories`, categoryRoutes);
app.use(`${basePath}/search`, searchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'E-Commerce Pro Platform API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.status(200).json({
      status: 'success',
      database: {
        state: states[dbState],
        readyState: dbState,
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database health check failed',
      error: error.message
    });
  }
});

// Redis health check
app.get('/health/redis', async (req, res) => {
  try {
    const redis = require('./config/redis');
    await redis.ping();
    
    res.status(200).json({
      status: 'success',
      redis: {
        status: 'connected',
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Redis health check failed',
      error: error.message
    });
  }
});

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server`
  });
});

// Error handling middleware
app.use(errorMiddleware);

// Export app for testing
module.exports = app;