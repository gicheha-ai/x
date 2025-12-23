// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Super Admin Configuration
export const SUPER_ADMIN_EMAIL = 'gichehalawrence@gmail.com';
export const SUPER_ADMIN_MOBILE = '254105441783';

// User Roles
export const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  AFFILIATE: 'affiliate',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

// Payment Methods
export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  AIRTEL_MONEY: 'airtel_money',
  BANK_TRANSFER: 'bank_transfer'
};

export const PAYMENT_METHOD_DETAILS = {
  [PAYMENT_METHODS.STRIPE]: {
    name: 'Credit/Debit Card',
    icon: '💳',
    description: 'Secure payment with Stripe',
    processingFee: 2.9,
    processingTime: 'Instant'
  },
  [PAYMENT_METHODS.PAYPAL]: {
    name: 'PayPal',
    icon: '👛',
    description: 'Pay with your PayPal account',
    processingFee: 3.49,
    processingTime: 'Instant'
  },
  [PAYMENT_METHODS.AIRTEL_MONEY]: {
    name: 'Airtel Money',
    icon: '📱',
    description: 'Mobile money payment',
    processingFee: 1.5,
    processingTime: '2-5 minutes'
  },
  [PAYMENT_METHODS.BANK_TRANSFER]: {
    name: 'Bank Transfer',
    icon: '🏦',
    description: 'Direct bank transfer',
    processingFee: 1.0,
    processingTime: '1-3 business days'
  }
};

// Boost Plans
export const BOOST_PLANS = {
  DAILY: {
    id: 'daily',
    name: 'Daily Boost',
    price: 10,
    duration: 1,
    durationUnit: 'day',
    features: ['Top placement', 'Boost badge', '24-hour visibility']
  },
  WEEKLY: {
    id: 'weekly',
    name: 'Weekly Boost',
    price: 50,
    duration: 7,
    durationUnit: 'days',
    features: ['All daily features', 'Newsletter inclusion', '7-day visibility']
  },
  MONTHLY: {
    id: 'monthly',
    name: 'Monthly Boost',
    price: 150,
    duration: 30,
    durationUnit: 'days',
    features: ['All weekly features', 'Homepage feature', 'Priority support']
  },
  FEATURED: {
    id: 'featured',
    name: 'Featured Spot',
    price: 200,
    duration: 7,
    durationUnit: 'days',
    features: ['All monthly features', 'Hero banner', 'Social media promotion']
  }
};

// Commission Rates
export const COMMISSION_RATES = {
  TRANSACTION_FEE: 0.08, // 8% for regular sellers
  AFFILIATE_COMMISSION: 0.20, // 20% for affiliates
  SUPER_ADMIN_COMMISSION: 0.00 // 0% for super admin (they bypass fees)
};

// Product Status
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: '#f59e0b',
  [ORDER_STATUS.PROCESSING]: '#3b82f6',
  [ORDER_STATUS.SHIPPED]: '#8b5cf6',
  [ORDER_STATUS.DELIVERED]: '#10b981',
  [ORDER_STATUS.CANCELLED]: '#ef4444',
  [ORDER_STATUS.REFUNDED]: '#6b7280'
};

// Categories
export const PRODUCT_CATEGORIES = [
  { id: 'electronics', name: 'Electronics', icon: '📱', color: '#3b82f6' },
  { id: 'fashion', name: 'Fashion', icon: '👗', color: '#8b5cf6' },
  { id: 'home', name: 'Home & Garden', icon: '🏠', color: '#10b981' },
  { id: 'sports', name: 'Sports & Outdoors', icon: '⚽', color: '#f59e0b' },
  { id: 'beauty', name: 'Beauty & Health', icon: '💄', color: '#ec4899' },
  { id: 'books', name: 'Books & Media', icon: '📚', color: '#6366f1' },
  { id: 'toys', name: 'Toys & Games', icon: '🎮', color: '#f97316' },
  { id: 'automotive', name: 'Automotive', icon: '🚗', color: '#64748b' },
  { id: 'food', name: 'Food & Grocery', icon: '🍎', color: '#84cc16' },
  { id: 'services', name: 'Services', icon: '🔧', color: '#06b6d4' }
];

// Price Ranges for Filtering
export const PRICE_RANGES = [
  { label: 'Under $10', min: 0, max: 10 },
  { label: '$10 - $25', min: 10, max: 25 },
  { label: '$25 - $50', min: 25, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $250', min: 100, max: 250 },
  { label: 'Over $250', min: 250, max: 10000 }
];

// Rating Options
export const RATING_OPTIONS = [
  { value: 5, label: '5 Stars & Up' },
  { value: 4, label: '4 Stars & Up' },
  { value: 3, label: '3 Stars & Up' },
  { value: 2, label: '2 Stars & Up' },
  { value: 1, label: '1 Star & Up' }
];

// Sort Options
export const SORT_OPTIONS = [
  { value: 'boost', label: 'Boosted First' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'sales', label: 'Best Selling' }
];

// Affiliate Levels
export const AFFILIATE_LEVELS = {
  STARTER: {
    name: 'Starter',
    minSales: 0,
    commission: 0.20,
    color: '#6b7280'
  },
  AFFILIATE: {
    name: 'Affiliate',
    minSales: 1000,
    commission: 0.21,
    color: '#10b981'
  },
  PRO: {
    name: 'Pro',
    minSales: 5000,
    commission: 0.22,
    color: '#3b82f6'
  },
  PARTNER: {
    name: 'Partner',
    minSales: 20000,
    commission: 0.23,
    color: '#8b5cf6'
  },
  AMBASSADOR: {
    name: 'Ambassador',
    minSales: 50000,
    commission: 0.25,
    color: '#f59e0b'
  }
};

// Validation Constants
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
  PHONE_REGEX: /^\+?[\d\s-]{10,}$/,
  URL_REGEX: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_FULL: 'MMMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100],
  MAX_PAGES_SHOWN: 5
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  CART: 'cart',
  THEME: 'theme',
  LANGUAGE: 'language',
  RECENT_SEARCHES: 'recent_searches',
  AFFILIATE_CODE: 'affiliate_code'
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AFFILIATE: true,
  ENABLE_BOOST: true,
  ENABLE_MOBILE_MONEY: true,
  ENABLE_SUPER_ADMIN_FEATURES: true,
  ENABLE_PRODUCT_REVIEWS: true,
  ENABLE_WISHLIST: true,
  ENABLE_SOCIAL_LOGIN: true
};

// Currency Configuration
export const CURRENCY = {
  DEFAULT: 'USD',
  SYMBOL: '$',
  LOCALE: 'en-US',
  DECIMALS: 2
};

// SEO Constants
export const SEO = {
  SITE_NAME: 'E-Commerce Pro Platform',
  SITE_DESCRIPTION: 'Global online marketplace connecting buyers, sellers, and affiliates with built-in monetization from day one.',
  DEFAULT_IMAGE: '/og-image.jpg',
  TWITTER_HANDLE: '@ecommercepro',
  FACEBOOK_APP_ID: ''
};

// Social Media Links
export const SOCIAL_MEDIA = {
  FACEBOOK: 'https://facebook.com/ecommercepro',
  TWITTER: 'https://twitter.com/ecommercepro',
  INSTAGRAM: 'https://instagram.com/ecommercepro',
  LINKEDIN: 'https://linkedin.com/company/ecommercepro',
  YOUTUBE: 'https://youtube.com/ecommercepro'
};

// Contact Information
export const CONTACT = {
  SUPPORT_EMAIL: 'support@ecommercepro.com',
  BUSINESS_EMAIL: 'business@ecommercepro.com',
  AFFILIATE_EMAIL: 'affiliates@ecommercepro.com',
  PHONE: '+1 (555) 123-4567',
  ADDRESS: '123 Commerce Street, Digital City, DC 12345'
};

// API Endpoints (for reference)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VALIDATE: '/api/auth/validate'
  },
  PRODUCTS: {
    BASE: '/api/products',
    SEARCH: '/api/products/search',
    CATEGORIES: '/api/categories'
  },
  ORDERS: {
    BASE: '/api/orders',
    CREATE: '/api/orders'
  },
  PAYMENTS: {
    BASE: '/api/payments',
    METHODS: '/api/payments/methods'
  },
  REVENUE: {
    SUMMARY: '/api/revenue/summary',
    ANALYTICS: '/api/revenue/analytics'
  },
  AFFILIATE: {
    BASE: '/api/affiliate',
    DASHBOARD: '/api/affiliate/dashboard'
  }
};

// Environment Detection
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_TEST = process.env.NODE_ENV === 'test';