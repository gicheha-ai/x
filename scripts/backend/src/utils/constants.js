// Application Constants

module.exports = {
  // ==================== USER ROLES AND TYPES ====================
  USER_TYPES: {
    BUYER: 'buyer',
    SELLER: 'seller',
    AFFILIATE: 'affiliate',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  },

  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
  },

  // ==================== PRODUCT CONSTANTS ====================
  PRODUCT_STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    OUT_OF_STOCK: 'out_of_stock',
    DISABLED: 'disabled',
    DELETED: 'deleted'
  },

  PRODUCT_CONDITION: {
    NEW: 'new',
    USED: 'used',
    REFURBISHED: 'refurbished',
    OPEN_BOX: 'open_box'
  },

  PRODUCT_VISIBILITY: {
    PUBLIC: 'public',
    PRIVATE: 'private',
    UNLISTED: 'unlisted'
  },

  // ==================== ORDER CONSTANTS ====================
  ORDER_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    DISPUTED: 'disputed',
    COMPLETED: 'completed'
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded'
  },

  SHIPPING_STATUS: {
    PENDING: 'pending',
    PACKED: 'packed',
    SHIPPED: 'shipped',
    IN_TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    RETURNED: 'returned'
  },

  // ==================== PAYMENT CONSTANTS ====================
  PAYMENT_METHODS: {
    STRIPE: 'stripe',
    PAYPAL: 'paypal',
    AIRTEL_MONEY: 'airtel_money',
    MPESA: 'mpesa',
    BANK_TRANSFER: 'bank_transfer',
    CASH_ON_DELIVERY: 'cash_on_delivery'
  },

  PAYMENT_CURRENCIES: {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    KES: 'KES',
    NGN: 'NGN',
    GHS: 'GHS',
    ZAR: 'ZAR'
  },

  // ==================== BOOST SALES CONSTANTS ====================
  BOOST_DURATIONS: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
  },

  BOOST_PRICES: {
    DAILY: 10,
    WEEKLY: 50,
    MONTHLY: 150
  },

  BOOST_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    PENDING: 'pending'
  },

  // ==================== AFFILIATE CONSTANTS ====================
  AFFILIATE_COMMISSION_RATE: 0.20, // 20%
  AFFILIATE_MINIMUM_WITHDRAWAL: 50,
  
  AFFILIATE_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    REJECTED: 'rejected'
  },

  AFFILIATE_PAYOUT_METHODS: {
    PAYPAL: 'paypal',
    BANK_TRANSFER: 'bank_transfer',
    AIRTEL_MONEY: 'airtel_money',
    MPESA: 'mpesa'
  },

  // ==================== SUBSCRIPTION CONSTANTS ====================
  SUBSCRIPTION_TIERS: {
    FREE: 'free',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  },

  SUBSCRIPTION_PRICES: {
    PREMIUM: 29,
    ENTERPRISE: 99
  },

  SUBSCRIPTION_FEATURES: {
    FREE: {
      maxProducts: 10,
      maxImagesPerProduct: 5,
      boostAllowed: true,
      analytics: 'basic',
      support: 'email'
    },
    PREMIUM: {
      maxProducts: 100,
      maxImagesPerProduct: 20,
      boostAllowed: true,
      analytics: 'advanced',
      support: 'priority',
      customDomain: false,
      apiAccess: false
    },
    ENTERPRISE: {
      maxProducts: 1000,
      maxImagesPerProduct: 50,
      boostAllowed: true,
      analytics: 'enterprise',
      support: '24/7',
      customDomain: true,
      apiAccess: true,
      whiteLabel: true
    }
  },

  // ==================== REVIEW AND RATING CONSTANTS ====================
  REVIEW_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REPORTED: 'reported'
  },

  RATING_VALUES: [1, 2, 3, 4, 5],

  // ==================== CATEGORY CONSTANTS ====================
  CATEGORY_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived'
  },

  // ==================== REVENUE CONSTANTS ====================
  REVENUE_SOURCES: {
    TRANSACTION_FEE: 'transaction_fee',
    BOOST_SALES: 'boost_sales',
    SUBSCRIPTION: 'subscription',
    AFFILIATE_COMMISSION: 'affiliate_commission',
    WITHDRAWAL_FEE: 'withdrawal_fee',
    LISTING_FEE: 'listing_fee',
    ADVERTISING: 'advertising',
    LINK_TRACKING: 'link_tracking'
  },

  PLATFORM_FEE_PERCENTAGE: 0.08, // 8%

  // ==================== NOTIFICATION CONSTANTS ====================
  NOTIFICATION_TYPES: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    SYSTEM: 'system'
  },

  NOTIFICATION_CATEGORIES: {
    ORDER: 'order',
    PAYMENT: 'payment',
    SHIPPING: 'shipping',
    ACCOUNT: 'account',
    PROMOTIONAL: 'promotional',
    SECURITY: 'security',
    SYSTEM: 'system'
  },

  // ==================== SEARCH AND FILTER CONSTANTS ====================
  SEARCH_OPERATORS: {
    EQUALS: 'eq',
    NOT_EQUALS: 'ne',
    GREATER_THAN: 'gt',
    GREATER_THAN_EQUALS: 'gte',
    LESS_THAN: 'lt',
    LESS_THAN_EQUALS: 'lte',
    IN: 'in',
    NOT_IN: 'nin',
    CONTAINS: 'contains',
    STARTS_WITH: 'startsWith',
    ENDS_WITH: 'endsWith'
  },

  SORT_ORDERS: {
    ASC: 'asc',
    DESC: 'desc'
  },

  // ==================== VALIDATION CONSTANTS ====================
  VALIDATION_RULES: {
    EMAIL_MAX_LENGTH: 255,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    PRODUCT_NAME_MIN_LENGTH: 3,
    PRODUCT_NAME_MAX_LENGTH: 200,
    PRODUCT_DESCRIPTION_MIN_LENGTH: 50,
    PRODUCT_DESCRIPTION_MAX_LENGTH: 5000,
    PRODUCT_PRICE_MIN: 0.01,
    PRODUCT_PRICE_MAX: 1000000,
    PRODUCT_STOCK_MIN: 0,
    PRODUCT_STOCK_MAX: 1000000
  },

  // ==================== FILE UPLOAD CONSTANTS ====================
  UPLOAD_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES_PER_UPLOAD: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },

  // ==================== SECURITY CONSTANTS ====================
  SECURITY: {
    PASSWORD_HASH_ROUNDS: 12,
    JWT_EXPIRY: '7d',
    REFRESH_TOKEN_EXPIRY: '30d',
    RESET_TOKEN_EXPIRY: 3600000, // 1 hour in milliseconds
    EMAIL_VERIFICATION_TOKEN_EXPIRY: 86400000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 15 * 60 * 1000 // 15 minutes
  },

  // ==================== API CONSTANTS ====================
  API: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: 100,
    CACHE_TTL: 300 // 5 minutes in seconds
  },

  // ==================== GEOGRAPHIC CONSTANTS ====================
  COUNTRIES: [
    { code: 'US', name: 'United States', currency: 'USD', phoneCode: '+1' },
    { code: 'KE', name: 'Kenya', currency: 'KES', phoneCode: '+254' },
    { code: 'NG', name: 'Nigeria', currency: 'NGN', phoneCode: '+234' },
    { code: 'GH', name: 'Ghana', currency: 'GHS', phoneCode: '+233' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', phoneCode: '+27' },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP', phoneCode: '+44' },
    { code: 'CA', name: 'Canada', currency: 'CAD', phoneCode: '+1' },
    { code: 'AU', name: 'Australia', currency: 'AUD', phoneCode: '+61' },
    { code: 'IN', name: 'India', currency: 'INR', phoneCode: '+91' },
    { code: 'DE', name: 'Germany', currency: 'EUR', phoneCode: '+49' },
    { code: 'FR', name: 'France', currency: 'EUR', phoneCode: '+33' },
    { code: 'IT', name: 'Italy', currency: 'EUR', phoneCode: '+39' },
    { code: 'ES', name: 'Spain', currency: 'EUR', phoneCode: '+34' },
    { code: 'BR', name: 'Brazil', currency: 'BRL', phoneCode: '+55' },
    { code: 'MX', name: 'Mexico', currency: 'MXN', phoneCode: '+52' },
    { code: 'JP', name: 'Japan', currency: 'JPY', phoneCode: '+81' },
    { code: 'CN', name: 'China', currency: 'CNY', phoneCode: '+86' },
    { code: 'RU', name: 'Russia', currency: 'RUB', phoneCode: '+7' }
  ],

  // ==================== TIME CONSTANTS ====================
  TIME: {
    ONE_MINUTE: 60000,
    ONE_HOUR: 3600000,
    ONE_DAY: 86400000,
    ONE_WEEK: 604800000,
    ONE_MONTH: 2592000000, // 30 days
    ONE_YEAR: 31536000000
  },

  // ==================== SUPER ADMIN CONSTANTS ====================
  SUPER_ADMIN: {
    EMAIL: process.env.SUPER_ADMIN_EMAIL || 'gichehalawrence@gmail.com',
    MOBILE_NUMBER: process.env.SUPER_ADMIN_MOBILE || '254105441783',
    PRIVILEGES: [
      'top-ranking',
      'revenue-dashboard',
      'link-generator',
      'platform-settings',
      'user-management',
      'content-moderation',
      'analytics-access',
      'system-configuration'
    ]
  },

  // ==================== LINK TRACKING CONSTANTS ====================
  LINK_TRACKING: {
    DEFAULT_EXPIRY_HOURS: 24,
    MAX_CLICKS_DEFAULT: null,
    STATUS: {
      ACTIVE: 'active',
      EXPIRED: 'expired',
      LIMIT_REACHED: 'limit_reached',
      DISABLED: 'disabled'
    }
  },

  // ==================== ERROR CODES ====================
  ERROR_CODES: {
    // Authentication errors
    AUTH_INVALID_CREDENTIALS: 'AUTH_001',
    AUTH_TOKEN_EXPIRED: 'AUTH_002',
    AUTH_TOKEN_INVALID: 'AUTH_003',
    AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_004',
    AUTH_ACCOUNT_LOCKED: 'AUTH_005',
    AUTH_EMAIL_NOT_VERIFIED: 'AUTH_006',
    
    // Validation errors
    VALIDATION_FAILED: 'VAL_001',
    VALIDATION_UNIQUE_CONSTRAINT: 'VAL_002',
    VALIDATION_REQUIRED_FIELD: 'VAL_003',
    VALIDATION_INVALID_FORMAT: 'VAL_004',
    VALIDATION_OUT_OF_RANGE: 'VAL_005',
    
    // Resource errors
    RESOURCE_NOT_FOUND: 'RES_001',
    RESOURCE_ALREADY_EXISTS: 'RES_002',
    RESOURCE_LIMIT_EXCEEDED: 'RES_003',
    RESOURCE_UNAVAILABLE: 'RES_004',
    
    // Payment errors
    PAYMENT_FAILED: 'PAY_001',
    PAYMENT_INSUFFICIENT_FUNDS: 'PAY_002',
    PAYMENT_DECLINED: 'PAY_003',
    PAYMENT_PROCESSING_ERROR: 'PAY_004',
    PAYMENT_REFUND_FAILED: 'PAY_005',
    
    // Order errors
    ORDER_INVALID: 'ORD_001',
    ORDER_CANCELLATION_FAILED: 'ORD_002',
    ORDER_UPDATE_FAILED: 'ORD_003',
    ORDER_SHIPPING_ERROR: 'ORD_004',
    
    // System errors
    SYSTEM_ERROR: 'SYS_001',
    DATABASE_ERROR: 'SYS_002',
    EXTERNAL_SERVICE_ERROR: 'SYS_003',
    NETWORK_ERROR: 'SYS_004',
    
    // Business logic errors
    BUSINESS_RULE_VIOLATION: 'BUS_001',
    INSUFFICIENT_STOCK: 'BUS_002',
    PRICE_MISMATCH: 'BUS_003',
    INVALID_OPERATION: 'BUS_004'
  },

  // ==================== SUCCESS CODES ====================
  SUCCESS_CODES: {
    // General success
    OPERATION_SUCCESSFUL: 'SUC_001',
    RESOURCE_CREATED: 'SUC_002',
    RESOURCE_UPDATED: 'SUC_003',
    RESOURCE_DELETED: 'SUC_004',
    
    // Authentication success
    LOGIN_SUCCESSFUL: 'AUTH_SUC_001',
    REGISTRATION_SUCCESSFUL: 'AUTH_SUC_002',
    PASSWORD_RESET_SUCCESSFUL: 'AUTH_SUC_003',
    EMAIL_VERIFIED: 'AUTH_SUC_004',
    
    // Payment success
    PAYMENT_SUCCESSFUL: 'PAY_SUC_001',
    REFUND_SUCCESSFUL: 'PAY_SUC_002',
    WITHDRAWAL_SUCCESSFUL: 'PAY_SUC_003',
    
    // Order success
    ORDER_PLACED: 'ORD_SUC_001',
    ORDER_SHIPPED: 'ORD_SUC_002',
    ORDER_DELIVERED: 'ORD_SUC_003'
  },

  // ==================== FEATURE FLAGS ====================
  FEATURE_FLAGS: {
    // Enable/disable features
    ENABLE_AFFILIATE_PROGRAM: true,
    ENABLE_BOOST_SALES: true,
    ENABLE_SUBSCRIPTIONS: true,
    ENABLE_MOBILE_MONEY: true,
    ENABLE_SOCIAL_LOGIN: true,
    ENABLE_PRODUCT_REVIEWS: true,
    ENABLE_WISHLIST: true,
    ENABLE_NOTIFICATIONS: true,
    ENABLE_ANALYTICS: true,
    ENABLE_SEARCH_INDEXING: true,
    
    // Rate limits
    MAX_PRODUCTS_PER_SELLER: 1000,
    MAX_IMAGES_PER_PRODUCT: 50,
    MAX_CATEGORIES: 1000,
    MAX_ORDERS_PER_DAY: 1000,
    
    // Performance settings
    ENABLE_CACHING: true,
    CACHE_DURATION: 300, // 5 minutes
    ENABLE_COMPRESSION: true,
    ENABLE_CDN: false,
    
    // Security settings
    ENABLE_2FA: false,
    ENABLE_CAPTCHA: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_IP_BLOCKING: false
  },

  // ==================== DEFAULT SETTINGS ====================
  DEFAULT_SETTINGS: {
    SITE_NAME: 'E-Commerce Pro Platform',
    SITE_URL: process.env.FRONTEND_URL || 'https://yourecommerce.com',
    SUPPORT_EMAIL: 'support@yourecommerce.com',
    SUPPORT_PHONE: '+254105441783',
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_TIMEZONE: 'UTC',
    DEFAULT_COUNTRY: 'US',
    DEFAULT_PAGINATION_LIMIT: 20,
    PRODUCTS_PER_PAGE: 24,
    AUTO_APPROVE_REVIEWS: true,
    AUTO_APPROVE_PRODUCTS: true,
    REQUIRE_EMAIL_VERIFICATION: true,
    REQUIRE_PHONE_VERIFICATION: false,
    ALLOW_GUEST_CHECKOUT: false,
    TAX_RATE: 0.0, // No tax by default
    SHIPPING_COST: 0.0, // Free shipping by default
    MINIMUM_ORDER_AMOUNT: 0.0,
    RETURN_POLICY_DAYS: 30,
    REFUND_POLICY_DAYS: 7
  },

  // ==================== COLOR CODES ====================
  COLORS: {
    PRIMARY: '#667eea',
    PRIMARY_DARK: '#5a67d8',
    SECONDARY: '#764ba2',
    SUCCESS: '#48bb78',
    WARNING: '#ed8936',
    DANGER: '#f56565',
    INFO: '#4299e1',
    LIGHT: '#f7fafc',
    DARK: '#2d3748',
    GRAY: '#a0aec0'
  },

  // ==================== SOCIAL MEDIA ====================
  SOCIAL_MEDIA: {
    FACEBOOK: 'https://facebook.com/yourecommerce',
    TWITTER: 'https://twitter.com/yourecommerce',
    INSTAGRAM: 'https://instagram.com/yourecommerce',
    LINKEDIN: 'https://linkedin.com/company/yourecommerce',
    YOUTUBE: 'https://youtube.com/yourecommerce',
    WHATSAPP: 'https://wa.me/254105441783'
  },

  // ==================== SEO CONSTANTS ====================
  SEO: {
    DEFAULT_TITLE: 'E-Commerce Pro Platform - Global Online Marketplace',
    DEFAULT_DESCRIPTION: 'Buy and sell products worldwide. Connect with buyers and sellers. Boost your products for better visibility. Start your e-commerce journey today!',
    DEFAULT_KEYWORDS: 'ecommerce, marketplace, online shopping, sell online, buy online, global marketplace',
    SITE_NAME: 'E-Commerce Pro',
    TWITTER_HANDLE: '@ecommercepro',
    FACEBOOK_APP_ID: '',
    DEFAULT_IMAGE: '/images/og-image.jpg',
    ROBOTS: 'index, follow'
  },

  // ==================== ANALYTICS CONSTANTS ====================
  ANALYTICS: {
    GOOGLE_ANALYTICS_ID: process.env.GA_ID || '',
    FACEBOOK_PIXEL_ID: process.env.FB_PIXEL_ID || '',
    HOTJAR_ID: process.env.HOTJAR_ID || '',
    MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN || ''
  }
};