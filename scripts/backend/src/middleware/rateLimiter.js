// backend/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { AppError } = require('./errorMiddleware');

/**
 * Redis client for rate limiting
 */
let redisClient;
try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  });

  redisClient.on('error', (err) => {
    console.warn('Redis connection error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected for rate limiting');
  });
} catch (error) {
  console.warn('Redis not available for rate limiting, using memory store');
  redisClient = null;
}

/**
 * Create rate limiter with Redis or memory store
 */
const createLimiter = (options = {}) => {
  const store = redisClient 
    ? new RedisStore({
        client: redisClient,
        prefix: 'ratelimit:',
        expiry: options.windowMs / 1000
      })
    : undefined;

  return rateLimit({
    store,
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        message: options.message || 'Too many requests from this IP, please try again later.',
        status: 'error',
        statusCode: 429
      }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    keyGenerator: options.keyGenerator || (req) => {
      // Use IP + user ID for authenticated users, IP only for anonymous
      return req.user ? `${req.ip}-${req.user.id}` : req.ip;
    },
    skip: options.skip || (req) => {
      // Skip rate limiting for super admin
      if (req.user && req.user.email === process.env.SUPER_ADMIN_EMAIL) {
        return true;
      }
      // Skip for whitelisted IPs
      const whitelist = process.env.RATE_LIMIT_WHITELIST 
        ? process.env.RATE_LIMIT_WHITELIST.split(',') 
        : [];
      return whitelist.includes(req.ip);
    },
    handler: options.handler || (req, res, next, options) => {
      throw new AppError(options.message, 429);
    }
  });
};

/**
 * Global rate limiter for all routes
 */
const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes.'
});

/**
 * Authentication rate limiter (strict)
 */
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts from this IP, please try again in 15 minutes.'
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many password reset requests, please try again in an hour.'
});

/**
 * API endpoint rate limiter
 */
const apiLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // 5000 requests per hour
  message: 'Too many API requests, please try again in an hour.'
});

/**
 * Payment endpoint rate limiter
 */
const paymentLimiter = createLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 payment attempts per 10 minutes
  message: 'Too many payment attempts, please try again in 10 minutes.'
});

/**
 * Product creation rate limiter (for sellers)
 */
const productCreationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 products per hour
  keyGenerator: (req) => req.user ? `${req.ip}-${req.user.id}-product` : req.ip,
  message: 'Too many product creations, please try again in an hour.'
});

/**
 * Review submission rate limiter
 */
const reviewLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 reviews per day
  keyGenerator: (req) => req.user ? `${req.ip}-${req.user.id}-review` : req.ip,
  message: 'You can only submit 10 reviews per day.'
});

/**
 * Boost purchase rate limiter
 */
const boostLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 boost purchases per hour
  keyGenerator: (req) => req.user ? `${req.ip}-${req.user.id}-boost` : req.ip,
  message: 'Too many boost purchases, please try again in an hour.'
});

/**
 * Search rate limiter
 */
const searchLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 searches per minute
  message: 'Too many search requests, please try again in a minute.'
});

/**
 * Affiliate link generation rate limiter
 */
const affiliateLinkLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 links per hour
  keyGenerator: (req) => req.user ? `${req.ip}-${req.user.id}-affiliate` : req.ip,
  message: 'Too many affiliate links generated, please try again in an hour.'
});

/**
 * Dynamic rate limiter based on user tier
 */
const dynamicLimiter = (req, res, next) => {
  let maxRequests;
  
  if (!req.user) {
    maxRequests = 100; // Anonymous users
  } else {
    switch (req.user.role) {
      case 'super-admin':
        maxRequests = 10000; // Unlimited for super admin
        break;
      case 'admin':
        maxRequests = 5000; // High limit for admin
        break;
      case 'seller':
        maxRequests = req.user.subscription?.tier === 'enterprise' ? 3000 : 1000;
        break;
      case 'affiliate':
        maxRequests = 2000;
        break;
      default:
        maxRequests = 500; // Regular users
    }
  }
  
  return createLimiter({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    message: `Rate limit exceeded for your account tier. Please try again in 15 minutes.`
  })(req, res, next);
};

/**
 * Rate limit status checker
 */
const rateLimitStatus = (req, res) => {
  const key = req.user ? `${req.ip}-${req.user.id}` : req.ip;
  
  if (!redisClient) {
    return res.json({
      success: true,
      data: {
        redis: false,
        message: 'Rate limiting using memory store'
      }
    });
  }
  
  redisClient.get(`ratelimit:${key}`, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error checking rate limit status'
      });
    }
    
    const data = result ? JSON.parse(result) : null;
    
    res.json({
      success: true,
      data: {
        redis: true,
        current: data ? data.totalHits : 0,
        remaining: data ? Math.max(0, 100 - data.totalHits) : 100,
        resetTime: data ? new Date(data.resetTime) : null,
        windowMs: 15 * 60 * 1000
      }
    });
  });
};

/**
 * Clear rate limit for specific key
 */
const clearRateLimit = async (key) => {
  if (!redisClient) return false;
  
  try {
    await redisClient.del(`ratelimit:${key}`);
    return true;
  } catch (error) {
    console.error('Error clearing rate limit:', error);
    return false;
  }
};

/**
 * Rate limit metrics
 */
const rateLimitMetrics = async () => {
  if (!redisClient) return null;
  
  try {
    const keys = await redisClient.keys('ratelimit:*');
    const metrics = {
      totalKeys: keys.length,
      byPrefix: {}
    };
    
    // Count by prefix
    for (const key of keys) {
      const prefix = key.split(':')[1];
      metrics.byPrefix[prefix] = (metrics.byPrefix[prefix] || 0) + 1;
    }
    
    return metrics;
  } catch (error) {
    console.error('Error getting rate limit metrics:', error);
    return null;
  }
};

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  paymentLimiter,
  productCreationLimiter,
  reviewLimiter,
  boostLimiter,
  searchLimiter,
  affiliateLinkLimiter,
  dynamicLimiter,
  rateLimitStatus,
  clearRateLimit,
  rateLimitMetrics,
  createLimiter
};