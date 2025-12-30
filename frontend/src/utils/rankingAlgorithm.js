// Product ranking algorithm for E-Commerce Pro Platform
// Special handling for super admin products (gichehalawrence@gmail.com)

// Base ranking factors and weights
const RANKING_WEIGHTS = {
  BOOST_LEVEL: 1000,        // Boost sales factor
  SALES_VELOCITY: 100,      // Recent sales per hour
  TIME_FACTOR: 500,         // Newness factor
  RATING: 300,              // Product rating
  REVIEW_COUNT: 2,          // Number of reviews
  CONVERSION_RATE: 50,      // Views to sales conversion
  STOCK_LEVEL: 10,          // Availability factor
  SELLER_RATING: 20,        // Seller reputation
  PRICE_COMPETITIVENESS: 5, // Price compared to category average
  SEASONALITY: 15           // Seasonal relevance
};

// Boost multiplier based on plan
const BOOST_MULTIPLIERS = {
  'daily': 1.0,
  'weekly': 1.5,
  'monthly': 2.0,
  'featured': 3.0,
  'super_admin': 1000 // Special multiplier for super admin
};

// Calculate product score for regular sellers
export const calculateProductScore = (product, boostData = null, context = {}) => {
  if (!product) return 0;
  
  const now = new Date();
  const createdAt = new Date(product.createdAt);
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  
  let score = 0;
  
  // 1. Boost sales factor (if boosted)
  if (boostData && boostData.isActive) {
    const boostMultiplier = getBoostMultiplier(boostData.plan);
    score += RANKING_WEIGHTS.BOOST_LEVEL * boostMultiplier;
    
    // Additional boost for time remaining
    const expiresAt = new Date(boostData.expiresAt);
    const hoursRemaining = (expiresAt - now) / (1000 * 60 * 60);
    const boostTimeBonus = Math.min(hoursRemaining / 24, 1); // Max 1x bonus
    score += RANKING_WEIGHTS.BOOST_LEVEL * 0.5 * boostTimeBonus;
  }
  
  // 2. Sales velocity (recent sales per hour)
  const salesVelocity = calculateSalesVelocity(product, context);
  score += salesVelocity * RANKING_WEIGHTS.SALES_VELOCITY;
  
  // 3. Time factor (newer products get bonus)
  const timeFactor = calculateTimeFactor(hoursSinceCreation);
  score += timeFactor * RANKING_WEIGHTS.TIME_FACTOR;
  
  // 4. Rating factor
  if (product.averageRating > 0) {
    const ratingFactor = product.averageRating / 5;
    score += ratingFactor * RANKING_WEIGHTS.RATING;
  }
  
  // 5. Review count factor
  if (product.reviewCount > 0) {
    const reviewFactor = Math.min(product.reviewCount, 100) / 100;
    score += reviewFactor * RANKING_WEIGHTS.REVIEW_COUNT * 100;
  }
  
  // 6. Conversion rate factor
  const conversionRate = calculateConversionRate(product);
  score += conversionRate * RANKING_WEIGHTS.CONVERSION_RATE;
  
  // 7. Stock level factor
  const stockFactor = calculateStockFactor(product.stock);
  score += stockFactor * RANKING_WEIGHTS.STOCK_LEVEL;
  
  // 8. Seller rating factor
  if (product.seller && product.seller.rating) {
    const sellerRatingFactor = product.seller.rating / 5;
    score += sellerRatingFactor * RANKING_WEIGHTS.SELLER_RATING;
  }
  
  // 9. Price competitiveness
  const priceFactor = calculatePriceFactor(product.price, context.categoryAveragePrice);
  score += priceFactor * RANKING_WEIGHTS.PRICE_COMPETITIVENESS;
  
  // 10. Seasonality factor
  const seasonalityFactor = calculateSeasonalityFactor(product.category, now);
  score += seasonalityFactor * RANKING_WEIGHTS.SEASONALITY;
  
  // Apply decay for older products (after 30 days)
  if (hoursSinceCreation > 720) { // 30 days
    const ageDecay = 1 - (hoursSinceCreation - 720) / (720 * 6); // Decay over 6 months
    score *= Math.max(ageDecay, 0.1); // Minimum 10% of original score
  }
  
  return Math.round(score);
};

// Get boost multiplier based on plan
const getBoostMultiplier = (plan) => {
  return BOOST_MULTIPLIERS[plan] || 1.0;
};

// Calculate sales velocity
const calculateSalesVelocity = (product, context) => {
  if (!product.salesCount || product.salesCount === 0) return 0;
  
  const now = new Date();
  let hoursSinceFirstSale;
  
  if (product.firstSaleDate) {
    const firstSale = new Date(product.firstSaleDate);
    hoursSinceFirstSale = (now - firstSale) / (1000 * 60 * 60);
  } else {
    hoursSinceFirstSale = 24; // Default to 24 hours if no first sale date
  }
  
  // Recent sales (last 24 hours) get more weight
  const recentSales = product.recentSales || product.salesCount * 0.1; // Estimate if not available
  const recentSalesWeight = 2; // Recent sales count double
  
  const baseVelocity = product.salesCount / Math.max(hoursSinceFirstSale, 1);
  const recentVelocity = recentSales * recentSalesWeight / 24;
  
  return baseVelocity + recentVelocity;
};

// Calculate time factor
const calculateTimeFactor = (hoursSinceCreation) => {
  // Products get bonus for first 7 days, then gradual decline
  if (hoursSinceCreation < 168) { // 7 days
    return 1 - (hoursSinceCreation / 168) * 0.5; // Start at 1, decline to 0.5
  }
  
  // After 7 days, slower decline
  return Math.max(0.5 - ((hoursSinceCreation - 168) / (168 * 4)), 0); // Decline over 4 weeks
};

// Calculate conversion rate
const calculateConversionRate = (product) => {
  if (!product.viewCount || product.viewCount === 0) return 0;
  
  const conversionRate = (product.salesCount / product.viewCount) * 100;
  
  // Cap conversion rate at 50% to prevent gaming
  return Math.min(conversionRate, 50);
};

// Calculate stock factor
const calculateStockFactor = (stock) => {
  if (stock === undefined || stock === null) return 0.5; // Unknown stock
  
  if (stock <= 0) return 0; // Out of stock
  
  if (stock <= 5) return 0.3; // Low stock
  
  if (stock <= 20) return 0.7; // Medium stock
  
  return 1; // Good stock
};

// Calculate price factor
const calculatePriceFactor = (price, categoryAveragePrice) => {
  if (!categoryAveragePrice || price === undefined) return 0.5;
  
  const priceRatio = price / categoryAveragePrice;
  
  // Products priced at 80-120% of average get full points
  if (priceRatio >= 0.8 && priceRatio <= 1.2) return 1;
  
  // Products within 50-80% or 120-150% get partial points
  if (priceRatio >= 0.5 && priceRatio < 0.8) return 0.7;
  if (priceRatio > 1.2 && priceRatio <= 1.5) return 0.7;
  
  // Too cheap or too expensive get lower points
  if (priceRatio < 0.5) return 0.3;
  if (priceRatio > 1.5) return 0.3;
  
  return 0.5;
};

// Calculate seasonality factor
const calculateSeasonalityFactor = (category, date) => {
  const month = date.getMonth() + 1;
  const seasonalityMap = {
    'electronics': [0.7, 0.7, 0.8, 0.8, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9], // Peak in Nov-Dec
    'fashion': [0.6, 0.7, 0.8, 0.9, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 0.8, 0.7], // Peak in Oct
    'home': [0.8, 0.8, 0.9, 1.0, 0.9, 0.8, 0.7, 0.8, 0.9, 0.9, 0.9, 0.9], // Peak in Apr
    'sports': [0.7, 0.8, 0.9, 1.0, 1.0, 0.9, 0.8, 0.9, 0.9, 0.8, 0.7, 0.7], // Peak in Apr-May
    'beauty': [0.8, 0.8, 0.9, 0.9, 1.0, 0.9, 0.8, 0.8, 0.9, 0.9, 0.9, 0.9], // Consistent
    'books': [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1.0, 1.0, 1.0, 1.0], // Peak in Sep-Dec
    'toys': [0.6, 0.6, 0.7, 0.7, 0.8, 0.8, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0], // Peak in Sep-Dec
    'food': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]  // Always relevant
  };
  
  const factors = seasonalityMap[category] || Array(12).fill(0.8);
  return factors[month - 1] || 0.8;
};

// Rank products with super admin exception
export const rankProducts = (products, userEmail = null, options = {}) => {
  if (!Array.isArray(products)) return [];
  
  const {
    category = null,
    boostOnly = false,
    includeSuperAdmin = true,
    limit = null
  } = options;
  
  // Filter by category if specified
  let filteredProducts = products;
  if (category) {
    filteredProducts = products.filter(p => p.category === category);
  }
  
  // Filter for boosted only if specified
  if (boostOnly) {
    const now = new Date();
    filteredProducts = filteredProducts.filter(p => 
      p.boostData && 
      p.boostData.isActive && 
      new Date(p.boostData.expiresAt) > now
    );
  }
  
  // Separate super admin products
  const superAdminEmail = 'gichehalawrence@gmail.com';
  const superAdminProducts = includeSuperAdmin 
    ? filteredProducts.filter(p => p.seller && p.seller.email === superAdminEmail)
    : [];
  
  const regularProducts = filteredProducts.filter(p => 
    !p.seller || p.seller.email !== superAdminEmail
  );
  
  // Calculate category average price for price competitiveness
  const categoryAveragePrice = calculateCategoryAveragePrice(regularProducts);
  
  // Sort regular products by score
  const sortedRegularProducts = [...regularProducts].sort((a, b) => {
    const context = { categoryAveragePrice };
    const scoreA = calculateProductScore(a, a.boostData, context);
    const scoreB = calculateProductScore(b, b.boostData, context);
    return scoreB - scoreA; // Descending
  });
  
  // If current user is super admin, show their products first
  if (userEmail === superAdminEmail) {
    const result = [...superAdminProducts, ...sortedRegularProducts];
    return limit ? result.slice(0, limit) : result;
  }
  
  // For all other users: super admin products always first, then boosted, then regular
  const result = [...superAdminProducts, ...sortedRegularProducts];
  return limit ? result.slice(0, limit) : result;
};

// Calculate category average price
const calculateCategoryAveragePrice = (products) => {
  if (!products.length) return 0;
  
  const total = products.reduce((sum, product) => sum + product.price, 0);
  return total / products.length;
};

// Categorize products for display
export const categorizeProducts = (products) => {
  const now = new Date();
  
  return {
    boosted: products.filter(p => 
      p.boostData && 
      p.boostData.isActive && 
      new Date(p.boostData.expiresAt) > now
    ),
    trending: products.filter(p => {
      // Products with high sales velocity and good conversion
      const context = {};
      const score = calculateProductScore(p, p.boostData, context);
      return score > 700 && (!p.boostData || !p.boostData.isActive);
    }),
    newArrivals: products.filter(p => {
      const createdAt = new Date(p.createdAt);
      const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);
      return daysOld <= 7;
    }),
    bestSellers: products.filter(p => {
      return p.salesCount > 10;
    }).sort((a, b) => b.salesCount - a.salesCount),
    superAdmin: products.filter(p => 
      p.seller && p.seller.email === 'gichehalawrence@gmail.com'
    ),
    standard: products.filter(p => {
      const context = {};
      const score = calculateProductScore(p, p.boostData, context);
      return score <= 500 && (!p.boostData || !p.boostData.isActive);
    })
  };
};

// Calculate boost cost
export const calculateBoostCost = (productId, plan, duration = 1) => {
  const basePrices = {
    daily: 10,
    weekly: 50,
    monthly: 150,
    featured: 200
  };
  
  const basePrice = basePrices[plan] || 10;
  
  // Apply duration multiplier
  let totalCost = basePrice * duration;
  
  // Apply volume discount for multiple boosts
  if (duration >= 12) {
    totalCost *= 0.7; // 30% discount
  } else if (duration >= 6) {
    totalCost *= 0.8; // 20% discount
  } else if (duration >= 3) {
    totalCost *= 0.9; // 10% discount
  }
  
  // Calculate savings
  const withoutDiscount = basePrice * duration;
  const savings = withoutDiscount - totalCost;
  
  return {
    basePrice,
    duration,
    withoutDiscount,
    discount: savings,
    discountPercentage: savings > 0 ? Math.round((savings / withoutDiscount) * 100) : 0,
    total: totalCost,
    perDay: Math.round((totalCost / duration) * 100) / 100,
    currency: 'USD',
    planDetails: getBoostPlanDetails(plan)
  };
};

// Get boost plan details
export const getBoostPlanDetails = (plan) => {
  const details = {
    'daily': {
      name: 'Daily Boost',
      description: '24-hour product visibility boost',
      duration: 1,
      unit: 'day',
      features: [
        'Top placement in search results',
        'Boost badge displayed on product',
        'Increased visibility in category pages',
        'Priority in trending sections',
        '24-hour duration'
      ],
      bestFor: 'Quick promotions, flash sales, or testing product demand',
      color: '#10b981'
    },
    'weekly': {
      name: 'Weekly Boost',
      description: '7-day comprehensive product promotion',
      duration: 7,
      unit: 'days',
      features: [
        'All Daily Boost features',
        'Featured in weekly promotional emails',
        'Inclusion in "Weekly Best" collection',
        'Social media shoutout (platform choice)',
        '7-day duration',
        '10% discount compared to daily rate'
      ],
      bestFor: 'Product launches, weekly sales, or inventory clearance',
      color: '#3b82f6'
    },
    'monthly': {
      name: 'Monthly Boost',
      description: '30-day premium product promotion',
      duration: 30,
      unit: 'days',
      features: [
        'All Weekly Boost features',
        'Homepage featured section placement',
        'Priority customer support for queries',
        'Advanced analytics dashboard',
        '30-day duration',
        '29% discount compared to daily rate'
      ],
      bestFor: 'Established products, seasonal items, or brand building',
      color: '#8b5cf6'
    },
    'featured': {
      name: 'Featured Spot',
      description: 'Premium featured placement package',
      duration: 7,
      unit: 'days',
      features: [
        'All Monthly Boost features',
        'Homepage hero banner placement',
        'Dedicated social media promotion',
        'Email blast to all subscribers',
        'Press release (if applicable)',
        'Highest visibility across all platforms'
      ],
      bestFor: 'Major promotions, brand awareness campaigns, or high-value products',
      color: '#f59e0b'
    }
  };
  
  return details[plan] || details['daily'];
};

// Calculate ROI for boost
export const calculateBoostROI = (boostCost, additionalSales) => {
  const commissionRate = 0.08; // 8% platform commission
  const revenueFromSales = additionalSales * commissionRate;
  
  if (boostCost === 0) return { roi: Infinity, profitable: true };
  
  const roi = (revenueFromSales / boostCost) * 100;
  
  return {
    roi: Math.round(roi * 100) / 100,
    revenueFromSales,
    boostCost,
    profitable: roi > 100,
    breakEvenSales: Math.ceil(boostCost / commissionRate)
  };
};

// Get recommended boost plan based on product performance
export const getRecommendedBoostPlan = (product) => {
  if (!product) return 'daily';
  
  const salesCount = product.salesCount || 0;
  const viewCount = product.viewCount || 1;
  const conversionRate = (salesCount / viewCount) * 100;
  
  if (salesCount > 100 && conversionRate > 5) {
    return 'monthly'; // High performer - invest in monthly boost
  }
  
  if (salesCount > 20 && conversionRate > 2) {
    return 'weekly'; // Medium performer - weekly boost
  }
  
  if (salesCount > 5) {
    return 'daily'; // Low performer - test with daily boost
  }
  
  return 'daily'; // New product - start with daily
};

// Calculate boost effectiveness score
export const calculateBoostEffectiveness = (product, boostData) => {
  if (!boostData || !boostData.isActive) {
    return { score: 0, effective: false };
  }
  
  const now = new Date();
  const boostStart = new Date(boostData.startDate);
  const boostEnd = new Date(boostData.expiresAt);
  
  if (now < boostStart || now > boostEnd) {
    return { score: 0, effective: false };
  }
  
  const boostDuration = (boostEnd - boostStart) / (1000 * 60 * 60 * 24); // Days
  const elapsedDuration = (now - boostStart) / (1000 * 60 * 60 * 24); // Days
  
  // Calculate metrics during boost period
  const viewsDuringBoost = product.viewsDuringBoost || 0;
  const salesDuringBoost = product.salesDuringBoost || 0;
  const avgDailyViewsBefore = product.avgDailyViews || 0;
  
  // Calculate improvement
  const dailyViewsDuringBoost = viewsDuringBoost / elapsedDuration;
  const viewImprovement = avgDailyViewsBefore > 0 
    ? ((dailyViewsDuringBoost - avgDailyViewsBefore) / avgDailyViewsBefore) * 100 
    : 100;
  
  const conversionRateDuringBoost = viewsDuringBoost > 0 
    ? (salesDuringBoost / viewsDuringBoost) * 100 
    : 0;
  
  const avgConversionRateBefore = product.avgConversionRate || 0;
  const conversionImprovement = avgConversionRateBefore > 0 
    ? ((conversionRateDuringBoost - avgConversionRateBefore) / avgConversionRateBefore) * 100 
    : conversionRateDuringBoost;
  
  // Calculate effectiveness score (0-100)
  let score = 0;
  score += Math.min(viewImprovement * 0.4, 40); // Max 40 points for views
  score += Math.min(conversionImprovement * 0.6, 60); // Max 60 points for conversion
  
  // Adjust for time remaining
  const timeRemainingRatio = (boostEnd - now) / (boostEnd - boostStart);
  score *= timeRemainingRatio;
  
  return {
    score: Math.round(score),
    effective: score > 50,
    viewImprovement: Math.round(viewImprovement),
    conversionImprovement: Math.round(conversionImprovement),
    metrics: {
      viewsDuringBoost,
      salesDuringBoost,
      dailyViewsDuringBoost: Math.round(dailyViewsDuringBoost),
      conversionRateDuringBoost: Math.round(conversionRateDuringBoost * 100) / 100
    }
  };
};
