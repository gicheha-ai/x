const Product = require('../models/Product');
const Boost = require('../models/Boost');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');

class RankingService {
  // ==================== SUPER ADMIN PRODUCT RANKING ====================
  
  /**
   * Check if user is super admin
   */
  isSuperAdmin(userEmail) {
    return userEmail === process.env.SUPER_ADMIN_EMAIL;
  }

  /**
   * Get super admin products (always ranked first)
   */
  async getSuperAdminProducts() {
    try {
      const superAdmin = await User.findOne({ 
        email: process.env.SUPER_ADMIN_EMAIL 
      });
      
      if (!superAdmin) {
        return [];
      }

      const products = await Product.find({
        seller: superAdmin._id,
        status: 'active'
      })
      .populate('seller', 'email name rating')
      .populate('category')
      .lean();

      // Add boost indicator for super admin products
      return products.map(product => ({
        ...product,
        isSuperAdminProduct: true,
        boostLevel: 'max', // Super admin products have maximum boost
        rankingScore: 1000, // Highest possible score
        featured: true
      }));
    } catch (error) {
      console.error('Get super admin products error:', error);
      return [];
    }
  }

  // ==================== REGULAR PRODUCT RANKING ====================
  
  /**
   * Calculate ranking score for regular products
   */
  async calculateProductRankingScore(product, context = {}) {
    try {
      let score = 0;
      
      // 1. Boost Sales Factor (40% weight)
      const boostFactor = await this.calculateBoostFactor(product);
      score += boostFactor * 0.4;
      
      // 2. Sales Velocity (25% weight)
      const salesVelocity = await this.calculateSalesVelocity(product);
      score += salesVelocity * 0.25;
      
      // 3. Product Quality (20% weight)
      const qualityFactor = await this.calculateQualityFactor(product);
      score += qualityFactor * 0.2;
      
      // 4. Seller Reputation (15% weight)
      const sellerReputation = await this.calculateSellerReputation(product.seller);
      score += sellerReputation * 0.15;
      
      // 5. Time Decay Factor (recent products get small boost)
      const timeDecay = this.calculateTimeDecay(product.createdAt);
      score *= timeDecay;
      
      // 6. Contextual factors (if provided)
      if (context.userId) {
        const personalizationFactor = await this.calculatePersonalizationFactor(product, context.userId);
        score *= personalizationFactor;
      }
      
      if (context.searchQuery) {
        const relevanceFactor = this.calculateRelevanceFactor(product, context.searchQuery);
        score *= relevanceFactor;
      }
      
      // Ensure score is between 0 and 1000
      return Math.min(Math.max(score, 0), 1000);
    } catch (error) {
      console.error('Ranking score calculation error:', error);
      return 500; // Default mid-range score
    }
  }

  // ==================== BOOST FACTOR CALCULATION ====================
  
  /**
   * Calculate boost sales factor
   */
  async calculateBoostFactor(product) {
    try {
      // Check for active boosts
      const activeBoost = await Boost.findOne({
        product: product._id,
        status: 'active',
        endDate: { $gt: new Date() }
      });
      
      if (!activeBoost) {
        return 0;
      }
      
      let boostScore = 0;
      
      // Boost duration multipliers
      switch (activeBoost.duration) {
        case 'daily':
          boostScore = 100;
          break;
        case 'weekly':
          boostScore = 300;
          break;
        case 'monthly':
          boostScore = 1000;
          break;
        default:
          boostScore = 50;
      }
      
      // Multiple boost stacking (if multiple boosts)
      const boostCount = await Boost.countDocuments({
        product: product._id,
        status: 'active',
        endDate: { $gt: new Date() }
      });
      
      if (boostCount > 1) {
        boostScore *= Math.min(boostCount, 3); // Cap at 3x multiplier
      }
      
      // Recent boost bonus (boosted within last 24 hours)
      const hoursSinceBoost = (new Date() - activeBoost.startDate) / (1000 * 60 * 60);
      if (hoursSinceBoost < 24) {
        boostScore *= 1.5;
      }
      
      return boostScore;
    } catch (error) {
      console.error('Boost factor calculation error:', error);
      return 0;
    }
  }

  // ==================== SALES VELOCITY CALCULATION ====================
  
  /**
   * Calculate sales velocity factor
   */
  async calculateSalesVelocity(product) {
    try {
      // Get recent orders (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = await Order.countDocuments({
        'items.product': product._id,
        status: 'completed',
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      // Get total sales count
      const totalSales = await Order.countDocuments({
        'items.product': product._id,
        status: 'completed'
      });
      
      // Calculate velocity score
      let velocityScore = 0;
      
      // Recent sales weight (70%)
      const recentScore = Math.min(recentOrders * 10, 700);
      
      // Total sales weight (30%)
      const totalScore = Math.min(totalSales, 300);
      
      velocityScore = recentScore + totalScore;
      
      // Sales trend (increasing/decreasing)
      const salesTrend = await this.calculateSalesTrend(product._id);
      velocityScore *= salesTrend;
      
      return velocityScore;
    } catch (error) {
      console.error('Sales velocity calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate sales trend (1.0 = stable, >1 = growing, <1 = declining)
   */
  async calculateSalesTrend(productId) {
    try {
      const now = new Date();
      const last30Days = new Date(now);
      last30Days.setDate(last30Days.getDate() - 30);
      
      const previous30Days = new Date(last30Days);
      previous30Days.setDate(previous30Days.getDate() - 30);
      
      // Sales in last 30 days
      const recentSales = await Order.countDocuments({
        'items.product': productId,
        status: 'completed',
        createdAt: { $gte: last30Days, $lt: now }
      });
      
      // Sales in previous 30 days
      const previousSales = await Order.countDocuments({
        'items.product': productId,
        status: 'completed',
        createdAt: { $gte: previous30Days, $lt: last30Days }
      });
      
      if (previousSales === 0) {
        return recentSales > 0 ? 1.5 : 1.0; // First sales get boost
      }
      
      const growthRate = recentSales / previousSales;
      
      // Cap growth rate between 0.5 and 2.0
      return Math.min(Math.max(growthRate, 0.5), 2.0);
    } catch (error) {
      console.error('Sales trend calculation error:', error);
      return 1.0;
    }
  }

  // ==================== QUALITY FACTOR CALCULATION ====================
  
  /**
   * Calculate product quality factor
   */
  async calculateQualityFactor(product) {
    try {
      let qualityScore = 0;
      
      // 1. Review Rating (40% of quality score)
      const reviewStats = await Review.aggregate([
        {
          $match: { product: product._id, status: 'approved' }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        }
      ]);
      
      const avgRating = reviewStats[0]?.averageRating || 0;
      const reviewCount = reviewStats[0]?.reviewCount || 0;
      
      // Rating score (0-400)
      const ratingScore = avgRating * 80; // 5 stars = 400 points
      
      // Review count bonus
      const countBonus = Math.min(reviewCount * 2, 100); // Max 100 bonus points
      
      qualityScore += ratingScore + countBonus;
      
      // 2. Product Completeness (30% of quality score)
      const completenessScore = this.calculateCompletenessScore(product);
      qualityScore += completenessScore * 0.3 * 1000;
      
      // 3. Image Quality (20% of quality score)
      const imageScore = this.calculateImageScore(product);
      qualityScore += imageScore * 0.2 * 1000;
      
      // 4. Description Quality (10% of quality score)
      const descriptionScore = this.calculateDescriptionScore(product);
      qualityScore += descriptionScore * 0.1 * 1000;
      
      return qualityScore;
    } catch (error) {
      console.error('Quality factor calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate product completeness score
   */
  calculateCompletenessScore(product) {
    let score = 0;
    const maxScore = 100;
    
    // Required fields check
    if (product.name && product.name.length > 3) score += 20;
    if (product.description && product.description.length > 50) score += 20;
    if (product.price && product.price > 0) score += 20;
    if (product.category) score += 20;
    if (product.images && product.images.length > 0) score += 20;
    
    // Optional fields bonus
    if (product.specifications && Object.keys(product.specifications).length > 0) score += 10;
    if (product.videoUrl) score += 5;
    if (product.dimensions) score += 5;
    if (product.weight) score += 5;
    if (product.brand) score += 5;
    
    return Math.min(score, maxScore) / 100;
  }

  /**
   * Calculate image quality score
   */
  calculateImageScore(product) {
    if (!product.images || product.images.length === 0) {
      return 0;
    }
    
    let score = 0;
    const maxScore = 100;
    
    // Number of images
    const imageCount = product.images.length;
    if (imageCount >= 5) score += 30;
    else if (imageCount >= 3) score += 20;
    else if (imageCount >= 1) score += 10;
    
    // Check for high-quality indicators (in production, use image analysis)
    // For now, we'll assume images are good if they have proper extensions
    const highQualityCount = product.images.filter(img => 
      img.includes('.jpg') || img.includes('.jpeg') || img.includes('.png') || img.includes('.webp')
    ).length;
    
    if (highQualityCount === imageCount) score += 30;
    else if (highQualityCount >= imageCount * 0.7) score += 20;
    else score += 10;
    
    // Has main image
    if (product.mainImage) score += 20;
    
    // Image variety (different angles)
    // Simplified check - if image URLs are different
    const uniqueImages = [...new Set(product.images.map(img => img.split('?')[0]))];
    if (uniqueImages.length >= 3) score += 20;
    
    return Math.min(score, maxScore) / 100;
  }

  /**
   * Calculate description quality score
   */
  calculateDescriptionScore(product) {
    if (!product.description) {
      return 0;
    }
    
    let score = 0;
    const maxScore = 100;
    
    const desc = product.description;
    const wordCount = desc.split(/\s+/).length;
    const charCount = desc.length;
    
    // Length score
    if (wordCount >= 500) score += 40;
    else if (wordCount >= 300) score += 30;
    else if (wordCount >= 150) score += 20;
    else if (wordCount >= 50) score += 10;
    
    // Formatting score (has paragraphs, bullet points, etc.)
    const hasParagraphs = desc.includes('\n\n') || desc.includes('<p>');
    const hasBullets = desc.includes('•') || desc.includes('- ') || desc.includes('<li>');
    const hasHeadings = desc.includes('\n#') || desc.includes('<h');
    
    if (hasParagraphs) score += 20;
    if (hasBullets) score += 20;
    if (hasHeadings) score += 20;
    
    return Math.min(score, maxScore) / 100;
  }

  // ==================== SELLER REPUTATION CALCULATION ====================
  
  /**
   * Calculate seller reputation factor
   */
  async calculateSellerReputation(sellerId) {
    try {
      const seller = await User.findById(sellerId);
      if (!seller) {
        return 0;
      }
      
      let reputationScore = 0;
      
      // 1. Seller Rating (40% of reputation)
      const sellerRating = seller.rating || 0;
      reputationScore += sellerRating * 40; // 5 stars = 200 points
      
      // 2. Sales Count (30% of reputation)
      const salesCount = await Order.countDocuments({
        seller: sellerId,
        status: 'completed'
      });
      
      const salesScore = Math.min(salesCount * 0.5, 150); // Max 150 points
      reputationScore += salesScore;
      
      // 3. Response Time & Communication (20% of reputation)
      const responseScore = await this.calculateResponseScore(sellerId);
      reputationScore += responseScore * 0.2 * 1000;
      
      // 4. Account Age & Activity (10% of reputation)
      const activityScore = this.calculateActivityScore(seller);
      reputationScore += activityScore * 0.1 * 1000;
      
      // Premium subscription bonus
      if (seller.subscriptionTier === 'premium') {
        reputationScore *= 1.2;
      } else if (seller.subscriptionTier === 'enterprise') {
        reputationScore *= 1.5;
      }
      
      return reputationScore;
    } catch (error) {
      console.error('Seller reputation calculation error:', error);
      return 0;
    }
  }

  /**
   * Calculate seller response score
   */
  async calculateResponseScore(sellerId) {
    try {
      // Get average response time to messages (simplified)
      // In production, calculate from actual message data
      
      // For now, use a default score based on seller metrics
      const recentOrders = await Order.countDocuments({
        seller: sellerId,
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      
      if (recentOrders === 0) {
        return 50; // Default score for new sellers
      }
      
      // Check for disputes or cancellations
      const disputes = await Order.countDocuments({
        seller: sellerId,
        status: { $in: ['disputed', 'cancelled'] },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });
      
      const disputeRate = recentOrders > 0 ? disputes / recentOrders : 0;
      
      // Higher score for lower dispute rates
      let score = 100 - (disputeRate * 500); // 0% disputes = 100, 20% disputes = 0
      return Math.max(score, 0);
    } catch (error) {
      console.error('Response score calculation error:', error);
      return 50;
    }
  }

  /**
   * Calculate seller activity score
   */
  calculateActivityScore(seller) {
    let score = 0;
    
    // Account age
    const accountAgeDays = (new Date() - seller.createdAt) / (1000 * 60 * 60 * 24);
    if (accountAgeDays >= 365) score += 40;
    else if (accountAgeDays >= 180) score += 30;
    else if (accountAgeDays >= 90) score += 20;
    else if (accountAgeDays >= 30) score += 10;
    
    // Recent activity (last login)
    if (seller.lastLogin) {
      const daysSinceLastLogin = (new Date() - seller.lastLogin) / (1000 * 60 * 60 * 24);
      if (daysSinceLastLogin <= 1) score += 30;
      else if (daysSinceLastLogin <= 7) score += 20;
      else if (daysSinceLastLogin <= 30) score += 10;
    }
    
    // Profile completeness
    if (seller.name) score += 10;
    if (seller.avatar) score += 10;
    if (seller.bio && seller.bio.length > 50) score += 10;
    
    return Math.min(score, 100) / 100;
  }

  // ==================== TIME DECAY CALCULATION ====================
  
  /**
   * Calculate time decay factor
   */
  calculateTimeDecay(createdAt) {
    const productAgeDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
    
    // New products get a boost for 7 days
    if (productAgeDays <= 7) {
      return 1.2; // 20% boost for new products
    }
    
    // Gradual decay after 7 days
    if (productAgeDays <= 30) {
      return 1.1; // 10% boost for products under 30 days
    }
    
    if (productAgeDays <= 90) {
      return 1.0; // Normal ranking for products 30-90 days
    }
    
    // Slow decay for older products
    const decayFactor = Math.max(0.8, 1 - (productAgeDays - 90) / 365);
    return decayFactor;
  }

  // ==================== PERSONALIZATION FACTOR ====================
  
  /**
   * Calculate personalization factor based on user preferences
   */
  async calculatePersonalizationFactor(product, userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return 1.0; // No personalization for non-logged in users
      }
      
      let personalizationScore = 1.0;
      
      // 1. Category preference
      if (user.preferences && user.preferences.favoriteCategories) {
        if (user.preferences.favoriteCategories.includes(product.category.toString())) {
          personalizationScore *= 1.3; // 30% boost for favorite categories
        }
      }
      
      // 2. Price range preference
      if (user.preferences && user.preferences.priceRange) {
        const { min, max } = user.preferences.priceRange;
        if (product.price >= min && product.price <= max) {
          personalizationScore *= 1.2; // 20% boost for preferred price range
        }
      }
      
      // 3. Seller preference (repeat purchases)
      const repeatPurchases = await Order.countDocuments({
        user: userId,
        seller: product.seller,
        status: 'completed'
      });
      
      if (repeatPurchases > 0) {
        personalizationScore *= (1 + (repeatPurchases * 0.1)); // 10% per repeat purchase
      }
      
      // 4. Viewed similar products
      if (user.recentViews) {
        const similarViews = user.recentViews.filter(view => 
          view.category === product.category.toString()
        ).length;
        
        if (similarViews > 0) {
          personalizationScore *= (1 + (similarViews * 0.05)); // 5% per similar view
        }
      }
      
      // Cap personalization factor between 0.5 and 2.0
      return Math.min(Math.max(personalizationScore, 0.5), 2.0);
    } catch (error) {
      console.error('Personalization factor calculation error:', error);
      return 1.0;
    }
  }

  // ==================== RELEVANCE FACTOR ====================
  
  /**
   * Calculate relevance factor for search queries
   */
  calculateRelevanceFactor(product, searchQuery) {
    if (!searchQuery || searchQuery.trim() === '') {
      return 1.0;
    }
    
    const query = searchQuery.toLowerCase().trim();
    let relevanceScore = 1.0;
    
    // Check product name
    const productName = product.name.toLowerCase();
    if (productName.includes(query)) {
      relevanceScore *= 1.5; // 50% boost for exact name match
    } else if (this.calculateStringSimilarity(productName, query) > 0.7) {
      relevanceScore *= 1.3; // 30% boost for similar name
    }
    
    // Check product description
    const productDesc = product.description.toLowerCase();
    if (productDesc.includes(query)) {
      relevanceScore *= 1.2; // 20% boost for description match
    }
    
    // Check product tags
    if (product.tags && Array.isArray(product.tags)) {
      const matchingTags = product.tags.filter(tag => 
        tag.toLowerCase().includes(query)
      ).length;
      
      if (matchingTags > 0) {
        relevanceScore *= (1 + (matchingTags * 0.1)); // 10% per matching tag
      }
    }
    
    // Check product category name
    if (product.category && product.category.name) {
      const categoryName = product.category.name.toLowerCase();
      if (categoryName.includes(query)) {
        relevanceScore *= 1.1; // 10% boost for category match
      }
    }
    
    // Cap relevance factor between 0.5 and 3.0
    return Math.min(Math.max(relevanceScore, 0.5), 3.0);
  }

  /**
   * Calculate string similarity (simplified Levenshtein distance)
   */
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    // Check if one string contains the other
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    
    // Simple common substring check
    let commonLength = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.substring(i, i + 3))) {
        commonLength += 3;
      }
    }
    
    return commonLength / longer.length;
  }

  // ==================== PRODUCT RANKING AND SORTING ====================
  
  /**
   * Rank products with super admin priority
   */
  async rankProducts(products, userEmail = null, context = {}) {
    try {
      // Get super admin products if user is not specified or is super admin
      let superAdminProducts = [];
      if (!userEmail || this.isSuperAdmin(userEmail)) {
        superAdminProducts = await this.getSuperAdminProducts();
      }
      
      // Calculate scores for regular products
      const rankedProducts = await Promise.all(
        products.map(async (product) => {
          const score = await this.calculateProductRankingScore(product, context);
          return {
            ...product,
            rankingScore: score,
            isSuperAdminProduct: false
          };
        })
      );
      
      // Combine and sort
      const allProducts = [
        ...superAdminProducts,
        ...rankedProducts
      ].sort((a, b) => b.rankingScore - a.rankingScore);
      
      return allProducts;
    } catch (error) {
      console.error('Product ranking error:', error);
      return products; // Return unsorted products on error
    }
  }

  /**
   * Get ranked products for homepage
   */
  async getHomepageRankedProducts(userEmail = null, limit = 20) {
    try {
      // Get active products
      const products = await Product.find({ status: 'active' })
        .populate('seller', 'email name rating subscriptionTier')
        .populate('category', 'name slug')
        .limit(100) // Get more than needed for ranking
        .lean();
      
      // Rank products
      const rankedProducts = await this.rankProducts(products, userEmail);
      
      // Return top products
      return rankedProducts.slice(0, limit);
    } catch (error) {
      console.error('Homepage ranking error:', error);
      return [];
    }
  }

  /**
   * Get ranked products by category
   */
  async getCategoryRankedProducts(categoryId, userEmail = null, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'ranking',
        minPrice,
        maxPrice,
        ratings
      } = options;
      
      const skip = (page - 1) * limit;
      
      // Build query
      const query = { 
        status: 'active',
        category: categoryId 
      };
      
      if (minPrice !== undefined) {
        query.price = { $gte: minPrice };
      }
      
      if (maxPrice !== undefined) {
        query.price = query.price || {};
        query.price.$lte = maxPrice;
      }
      
      if (ratings !== undefined) {
        query.rating = { $gte: ratings };
      }
      
      // Get products
      let productsQuery = Product.find(query)
        .populate('seller', 'email name rating subscriptionTier')
        .populate('category', 'name slug');
      
      // Apply different sorting based on sortBy
      switch (sortBy) {
        case 'price_low':
          productsQuery = productsQuery.sort({ price: 1 });
          break;
        case 'price_high':
          productsQuery = productsQuery.sort({ price: -1 });
          break;
        case 'newest':
          productsQuery = productsQuery.sort({ createdAt: -1 });
          break;
        case 'rating':
          productsQuery = productsQuery.sort({ rating: -1 });
          break;
        case 'sales':
          // Would need to join with orders for accurate sales count
          productsQuery = productsQuery.sort({ salesCount: -1 });
          break;
        case 'ranking':
        default:
          // Will be sorted by ranking score after calculation
          break;
      }
      
      productsQuery = productsQuery.skip(skip).limit(limit * 2); // Get more for ranking
      
      const products = await productsQuery.lean();
      
      // Rank products if using default ranking
      let rankedProducts;
      if (sortBy === 'ranking') {
        rankedProducts = await this.rankProducts(products, userEmail);
      } else {
        rankedProducts = products;
      }
      
      // Get total count for pagination
      const total = await Product.countDocuments(query);
      
      return {
        products: rankedProducts.slice(0, limit),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        sortBy,
        filters: {
          categoryId,
          minPrice,
          maxPrice,
          ratings
        }
      };
    } catch (error) {
      console.error('Category ranking error:', error);
      throw error;
    }
  }

  // ==================== TRENDING PRODUCTS ====================
  
  /**
   * Get trending products (based on recent sales velocity)
   */
  async getTrendingProducts(limit = 10) {
    try {
      // Get products with recent sales
      const recentProducts = await Order.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: '$items.product',
            salesCount: { $sum: '$items.quantity' },
            recentOrders: { $sum: 1 }
          }
        },
        {
          $sort: { salesCount: -1 }
        },
        {
          $limit: limit * 2
        }
      ]);
      
      const productIds = recentProducts.map(p => p._id);
      
      // Get product details
      const products = await Product.find({
        _id: { $in: productIds },
        status: 'active'
      })
      .populate('seller', 'email name rating')
      .populate('category', 'name slug')
      .lean();
      
      // Add sales data to products
      const productsWithSales = products.map(product => {
        const salesData = recentProducts.find(p => p._id.toString() === product._id.toString());
        return {
          ...product,
          recentSales: salesData?.salesCount || 0,
          recentOrders: salesData?.recentOrders || 0,
          trendingScore: (salesData?.salesCount || 0) * 10 // Simple trending score
        };
      });
      
      // Sort by trending score
      return productsWithSales
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Trending products error:', error);
      return [];
    }
  }

  // ==================== RECOMMENDATION ENGINE ====================
  
  /**
   * Get personalized product recommendations
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return this.getTrendingProducts(limit);
      }
      
      const recommendations = [];
      
      // 1. Based on purchase history
      const purchaseHistory = await Order.find({
        user: userId,
        status: 'completed'
      })
      .populate('items.product')
      .limit(10);
      
      const purchasedCategories = new Set();
      const purchasedSellers = new Set();
      
      purchaseHistory.forEach(order => {
        order.items.forEach(item => {
          if (item.product && item.product.category) {
            purchasedCategories.add(item.product.category.toString());
            purchasedSellers.add(item.product.seller.toString());
          }
        });
      });
      
      if (purchasedCategories.size > 0) {
        const categoryRecommendations = await Product.find({
          category: { $in: Array.from(purchasedCategories) },
          status: 'active',
          _id: { $nin: purchaseHistory.flatMap(o => o.items.map(i => i.product?._id)) }
        })
        .populate('seller', 'email name rating')
        .populate('category', 'name slug')
        .limit(limit)
        .lean();
        
        recommendations.push(...categoryRecommendations);
      }
      
      // 2. Based on viewed products
      if (user.recentViews && user.recentViews.length > 0) {
        const viewedCategories = user.recentViews.map(view => view.category);
        const uniqueCategories = [...new Set(viewedCategories)];
        
        if (uniqueCategories.length > 0) {
          const viewRecommendations = await Product.find({
            category: { $in: uniqueCategories },
            status: 'active'
          })
          .populate('seller', 'email name rating')
          .populate('category', 'name slug')
          .limit(limit)
          .lean();
          
          recommendations.push(...viewRecommendations);
        }
      }
      
      // 3. Based on similar users (simplified collaborative filtering)
      if (recommendations.length < limit) {
        const trendingProducts = await this.getTrendingProducts(limit);
        recommendations.push(...trendingProducts);
      }
      
      // Remove duplicates and rank
      const uniqueRecommendations = Array.from(
        new Map(recommendations.map(item => [item._id.toString(), item])).values()
      );
      
      // Rank recommendations
      const rankedRecommendations = await this.rankProducts(
        uniqueRecommendations,
        user.email,
        { userId }
      );
      
      return rankedRecommendations.slice(0, limit);
    } catch (error) {
      console.error('Recommendation engine error:', error);
      return this.getTrendingProducts(limit);
    }
  }

  // ==================== RANKING HEALTH MONITORING ====================
  
  /**
   * Monitor ranking system health
   */
  async monitorRankingHealth() {
    try {
      const stats = {
        timestamp: new Date(),
        productCount: await Product.countDocuments({ status: 'active' }),
        boostedProducts: await Boost.countDocuments({
          status: 'active',
          endDate: { $gt: new Date() }
        }),
        superAdminProducts: await this.getSuperAdminProducts().then(p => p.length),
        averageRankingScore: 0,
        scoreDistribution: { high: 0, medium: 0, low: 0 },
        issues: []
      };
      
      // Sample products to calculate average score
      const sampleProducts = await Product.find({ status: 'active' })
        .limit(100)
        .populate('seller', 'email')
        .lean();
      
      const scores = await Promise.all(
        sampleProducts.map(async product => {
          return await this.calculateProductRankingScore(product);
        })
      );
      
      if (scores.length > 0) {
        stats.averageRankingScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        // Score distribution
        scores.forEach(score => {
          if (score >= 700) stats.scoreDistribution.high++;
          else if (score >= 300) stats.scoreDistribution.medium++;
          else stats.scoreDistribution.low++;
        });
      }
      
      // Check for potential issues
      if (stats.averageRankingScore < 300) {
        stats.issues.push('Average ranking score is too low');
      }
      
      if (stats.scoreDistribution.low > stats.scoreDistribution.high * 2) {
        stats.issues.push('Too many low-ranking products');
      }
      
      if (stats.boostedProducts === 0 && stats.productCount > 50) {
        stats.issues.push('No products are currently boosted');
      }
      
      return stats;
    } catch (error) {
      console.error('Ranking health monitoring error:', error);
      return {
        timestamp: new Date(),
        error: error.message,
        issues: ['Ranking system monitoring failed']
      };
    }
  }

  // ==================== RANKING SYSTEM OPTIMIZATION ====================
  
  /**
   * Optimize ranking algorithm weights
   */
  async optimizeRankingWeights(testData) {
    try {
      // This would typically involve A/B testing and machine learning
      // For now, return current weights
      return {
        boostFactorWeight: 0.4,
        salesVelocityWeight: 0.25,
        qualityFactorWeight: 0.2,
        sellerReputationWeight: 0.15,
        timeDecayEnabled: true,
        personalizationEnabled: true,
        optimizationStatus: 'stable',
        lastOptimized: new Date(),
        performanceMetrics: {
          clickThroughRate: 0.15, // Example metrics
          conversionRate: 0.03,
          averageOrderValue: 45.50
        }
      };
    } catch (error) {
      console.error('Ranking optimization error:', error);
      throw error;
    }
  }
}

module.exports = new RankingService();