const config = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  
  // Payment Configuration
  STRIPE_PUBLIC_KEY: process.env.REACT_APP_STRIPE_PUBLIC_KEY,
  PAYPAL_CLIENT_ID: process.env.REACT_APP_PAYPAL_CLIENT_ID,
  
  // Super Admin Configuration
  SUPER_ADMIN_EMAIL: 'gichehalawrence@gmail.com',
  COMPANY_PHONE: '254105441783',
  
  // App Configuration
  APP_NAME: 'E-Commerce Platform',
  APP_DESCRIPTION: 'Full-featured e-commerce platform with multiple payment options',
  
  // Features Configuration
  FEATURES: {
    BOOST_SALES: true,
    AFFILIATE_MARKETING: true,
    MOBILE_MONEY: true,
    SEARCH_SUGGESTIONS: true,
    PRODUCT_RANKING: true,
    REVENUE_TRACKING: true
  },
  
  // Boost Sales Pricing
  BOOST_PRICING: {
    DAILY: 10,
    WEEKLY: 50,
    MONTHLY: 150
  },
  
  // Commission Rates
  COMMISSIONS: {
    PLATFORM: 0.08, // 8%
    AFFILIATE: 0.20, // 20%
    SELLER: 0.72 // 72% (remaining after platform and affiliate)
  },
  
  // Link Tracking Configuration
  LINK_TRACKING: {
    EXPIRY_HOURS: 24,
    GENERATION_LIMIT: 100
  }
};

export default config;