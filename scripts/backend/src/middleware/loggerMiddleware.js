// backend/src/middleware/loggerMiddleware.js
const fs = require('fs');
const path = require('path');

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Log colors for console
 */
const LOG_COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  RESET: '\x1b[0m'   // Reset
};

/**
 * Logger class with different log levels
 */
class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || LOG_LEVELS.INFO;
    this.logToFile = options.logToFile || false;
    this.logDir = options.logDir || 'logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    
    // Create log directory if it doesn't exist
    if (this.logToFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get log file name for today
   */
  getLogFileName(level) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${date}-${level.toLowerCase()}.log`);
  }

  /**
   * Rotate log file if it's too large
   */
  rotateLogFile(filename) {
    try {
      if (fs.existsSync(filename)) {
        const stats = fs.statSync(filename);
        if (stats.size > this.maxFileSize) {
          const timestamp = new Date().getTime();
          const newFilename = `${filename}.${timestamp}`;
          fs.renameSync(filename, newFilename);
        }
      }
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  /**
   * Write log to file
   */
  writeToFile(level, message, data = null) {
    const filename = this.getLogFileName(level);
    this.rotateLogFile(filename);
    
    const logEntry = {
      timestamp: this.getTimestamp(),
      level,
      message,
      data: data || null
    };
    
    try {
      fs.appendFileSync(filename, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  /**
   * Format log message for console
   */
  formatConsoleMessage(level, message, data = null) {
    const color = LOG_COLORS[level] || LOG_COLORS.INFO;
    const reset = LOG_COLORS.RESET;
    
    let formatted = `${color}[${level}] ${this.getTimestamp()} ${message}${reset}`;
    
    if (data && process.env.NODE_ENV === 'development') {
      formatted += `\n${color}Data: ${JSON.stringify(data, null, 2)}${reset}`;
    }
    
    return formatted;
  }

  /**
   * Log message based on level
   */
  log(level, message, data = null) {
    const levelValue = LOG_LEVELS[level];
    
    // Check if we should log this level
    if (levelValue > this.logLevel) return;
    
    // Log to console
    console.log(this.formatConsoleMessage(level, message, data));
    
    // Log to file if enabled
    if (this.logToFile) {
      this.writeToFile(level, message, data);
    }
  }

  /**
   * Error log
   */
  error(message, data = null) {
    this.log('ERROR', message, data);
  }

  /**
   * Warning log
   */
  warn(message, data = null) {
    this.log('WARN', message, data);
  }

  /**
   * Info log
   */
  info(message, data = null) {
    this.log('INFO', message, data);
  }

  /**
   * Debug log
   */
  debug(message, data = null) {
    this.log('DEBUG', message, data);
  }

  /**
   * HTTP request log
   */
  http(req, res, responseTime) {
    const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : 'anonymous',
      contentLength: res.get('content-length') || '0'
    };
    
    this.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
  }
}

// Create default logger instance
const logger = new Logger({
  logLevel: process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO,
  logToFile: process.env.LOG_TO_FILE === 'true',
  logDir: process.env.LOG_DIR || 'logs'
});

/**
 * HTTP request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logger.debug(`Request started: ${req.method} ${req.originalUrl}`);
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(req, res, responseTime);
  });
  
  next();
};

/**
 * Database query logger
 */
const dbLogger = (query) => {
  logger.debug('Database Query', {
    collection: query.collection.name,
    operation: query.op,
    query: query._conditions,
    options: query.options
  });
};

/**
 * Payment transaction logger
 */
const paymentLogger = (transaction) => {
  logger.info('Payment Transaction', {
    transactionId: transaction.transactionId,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    method: transaction.method
  });
};

/**
 * User activity logger
 */
const activityLogger = (userId, action, details = {}) => {
  logger.info('User Activity', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Security event logger
 */
const securityLogger = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown'
  });
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationMs = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);
    
    if (durationMs > 1000) { // Log slow requests (>1s)
      logger.warn('Slow Request', {
        method: req.method,
        url: req.originalUrl,
        duration: `${durationMs}ms`,
        userId: req.user ? req.user.id : 'anonymous'
      });
    }
    
    // Log all requests in debug mode
    logger.debug('Request Performance', {
      method: req.method,
      url: req.originalUrl,
      duration: `${durationMs}ms`,
      status: res.statusCode
    });
  });
  
  next();
};

/**
 * Audit trail middleware
 */
const auditLogger = (req, res, next) => {
  const originalSend = res.send;
  const auditData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user ? req.user.id : null,
    requestBody: req.body,
    responseStatus: null,
    responseBody: null
  };
  
  res.send = function(data) {
    auditData.responseStatus = res.statusCode;
    auditData.responseBody = data;
    
    // Log sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      logger.info('Audit Trail', auditData);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error context logger
 */
const errorContextLogger = (err, req) => {
  const context = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    request: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers
    },
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : null
  };
  
  logger.error('Error Context', context);
};

module.exports = {
  Logger,
  logger,
  requestLogger,
  dbLogger,
  paymentLogger,
  activityLogger,
  securityLogger,
  performanceMonitor,
  auditLogger,
  errorContextLogger,
  LOG_LEVELS
};