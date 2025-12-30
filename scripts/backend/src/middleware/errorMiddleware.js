// backend/src/middleware/errorMiddleware.js

/**
 * Custom error class for API errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error Handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Development error handler (with stack trace)
 */
const developmentError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status,
      statusCode: err.statusCode
    }
  });
};

/**
 * Production error handler (no stack trace)
 */
const productionError = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        status: err.status,
        statusCode: err.statusCode
      }
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong!',
        status: 'error',
        statusCode: 500
      }
    });
  }
};

/**
 * MongoDB duplicate key error handler
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${value}. Please use another value for ${field}.`;
  return new AppError(message, 400);
};

/**
 * MongoDB validation error handler
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * MongoDB CastError handler
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * JWT Error handler
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again!', 401);
};

/**
 * JWT Expired Error handler
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

/**
 * Rate limit error handler
 */
const handleRateLimitError = () => {
  return new AppError('Too many requests from this IP, please try again later.', 429);
};

/**
 * File upload error handler
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File too large. Maximum file size is 5MB.', 400);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum 5 files allowed.', 400);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected file field.', 400);
  }
  return new AppError('File upload failed.', 400);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (error.code === 11000) error = handleDuplicateKeyError(error);
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.name === 'CastError') error = handleCastError(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.name === 'RateLimitError') error = handleRateLimitError();
  if (error.name === 'MulterError') error = handleMulterError(error);

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    });
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    developmentError(error, req, res, next);
  } else {
    productionError(error, req, res, next);
  }
};

/**
 * Async error handler wrapper (for async route handlers)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user ? req.user.id : 'anonymous',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('📛 ERROR LOG:', logEntry);
  }

  // Log to file in production (implement based on your logging solution)
  if (process.env.NODE_ENV === 'production') {
    // Example: Write to error log file
    // fs.appendFileSync('error.log', JSON.stringify(logEntry) + '\n');
  }

  next(err);
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  return (signal) => {
    console.log(`${signal} received. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('HTTP server closed.');
      
      // Close database connections if any
      // mongoose.connection.close(false, () => {
      //   console.log('MongoDB connection closed.');
      //   process.exit(0);
      // });
      
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

/**
 * Unhandled promise rejection handler
 */
const unhandledRejectionHandler = () => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION 💥', err.name, err.message);
    
    // Close server & exit process
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION 💥', err.name, err.message);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
  errorLogger,
  gracefulShutdown,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  developmentError,
  productionError
};