// backend/src/controllers/searchController.js
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');
const { cache } = require('../utils/cache');

/**
 * @desc    Search products and accounts
 * @route   GET /api/search
 * @access  Public
 */
exports.searchAll = async (req, res) => {
  try {
    const { 
      q, 
      type = 'all', // 'products', 'sellers', 'categories', 'all'
      category,
      minPrice,
      maxPrice,
      rating,
      sort = 'relevance',
      page = 1,
      limit = 20,
      inStock = true
    } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const cacheKey = `search:${q}:${type}:${page}:${sort}:${category}:${minPrice}:${maxPrice}`;
    const cachedResults = cache.get(cacheKey);
    
    if (cachedResults) {
      return res.json({
        success: true,
        ...cachedResults,
        fromCache: true
      });
    }

    let results = {
      products: [],
      sellers: [],
      categories: [],
      totalResults: 0
    };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search products
    if (type === 'all' || type === 'products') {
      const productQuery = buildProductQuery(q, category, minPrice, maxPrice, rating, inStock);
      const productSort = getProductSort(sort);

      const [products, totalProducts] = await Promise.all([
        Product.find(productQuery)
          .select('name slug price images averageRating reviewsCount salesCount isBoosted boostExpiresAt seller category')
          .populate('seller', 'name rating avatar')
          .populate('category', 'name slug')
          .sort(productSort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Product.countDocuments(productQuery)
      ]);

      results.products = products;
      results.totalResults += totalProducts;
    }

    // Search sellers (users with seller role)
    if (type === 'all' || type === 'sellers') {
      const sellerQuery = {
        role: { $in: ['seller', 'admin'] },
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { 'store.name': { $regex: q, $options: 'i' } },
          { 'store.description': { $regex: q, $options: 'i' } }
        ]
      };

      const [sellers, totalSellers] = await Promise.all([
        User.find(sellerQuery)
          .select('name email avatar rating store productsCount joinedAt')
          .limit(limitNum)
          .skip(skip)
          .lean(),
        User.countDocuments(sellerQuery)
      ]);

      // Get product counts for sellers
      await Promise.all(
        sellers.map(async (seller) => {
          seller.productsCount = await Product.countDocuments({
            seller: seller._id,
            isActive: true
          });
        })
      );

      results.sellers = sellers;
      results.totalResults += totalSellers;
    }

    // Search categories
    if (type === 'all' || type === 'categories') {
      const categoryQuery = {
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { slug: { $regex: q, $options: 'i' } }
        ]
      };

      const [categories, totalCategories] = await Promise.all([
        Category.find(categoryQuery)
          .select('name slug description image productCount')
          .limit(limitNum)
          .skip(skip)
          .lean(),
        Category.countDocuments(categoryQuery)
      ]);

      // Get product counts for categories
      await Promise.all(
        categories.map(async (category) => {
          category.productCount = await Product.countDocuments({
            category: category._id,
            isActive: true
          });
        })
      );

      results.categories = categories;
      results.totalResults += totalCategories;
    }

    // Calculate relevance scores for "all" search
    if (type === 'all') {
      // Boost product scores based on relevance
      results.products = results.products.map(product => ({
        ...product,
        relevanceScore: calculateRelevanceScore(product, q)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Limit results for each type in "all" search
      results.products = results.products.slice(0, 10);
      results.sellers = results.sellers.slice(0, 5);
      results.categories = results.categories.slice(0, 5);
    }

    const response = {
      query: q,
      type,
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalResults: results.totalResults,
        hasMore: results.totalResults > (skip + limitNum)
      },
      filters: {
        category: category || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        rating: rating || null,
        sort,
        inStock
      }
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response, 300);

    res.json({
      success: true,
      ...response,
      fromCache: false
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get search suggestions
 * @route   GET /api/search/suggestions
 * @access  Public
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.trim() === '' || q.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const cacheKey = `search:suggestions:${q}:${type}`;
    const cachedSuggestions = cache.get(cacheKey);
    
    if (cachedSuggestions) {
      return res.json({
        success: true,
        ...cachedSuggestions,
        fromCache: true
      });
    }

    const suggestions = {
      products: [],
      categories: [],
      sellers: [],
      popularQueries: []
    };

    // Product suggestions
    if (type === 'all' || type === 'products') {
      const productSuggestions = await Product.find({
        isActive: true,
        isPublished: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } }
        ]
      })
        .select('name slug price images category')
        .populate('category', 'name')
        .limit(5)
        .lean();

      suggestions.products = productSuggestions;
    }

    // Category suggestions
    if (type === 'all' || type === 'categories') {
      const categorySuggestions = await Category.find({
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      })
        .select('name slug image')
        .limit(5)
        .lean();

      suggestions.categories = categorySuggestions;
    }

    // Seller suggestions
    if (type === 'all' || type === 'sellers') {
      const sellerSuggestions = await User.find({
        role: { $in: ['seller', 'admin'] },
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { 'store.name': { $regex: q, $options: 'i' } }
        ]
      })
        .select('name avatar store.name')
        .limit(5)
        .lean();

      suggestions.sellers = sellerSuggestions;
    }

    // Popular search queries (from analytics or pre-defined)
    if (type === 'all') {
      suggestions.popularQueries = getPopularQueries(q);
    }

    const response = {
      query: q,
      suggestions,
      timestamp: new Date()
    };

    // Cache for 2 minutes (shorter cache for suggestions)
    cache.set(cacheKey, response, 120);

    res.json({
      success: true,
      ...response,
      fromCache: false
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: true,
      suggestions: []
    });
  }
};

/**
 * @desc    Get advanced search filters
 * @route   GET /api/search/filters
 * @access  Public
 */
exports.getSearchFilters = async (req, res) => {
  try {
    const { q, category } = req.query;

    const cacheKey = `search:filters:${q}:${category || 'all'}`;
    const cachedFilters = cache.get(cacheKey);
    
    if (cachedFilters) {
      return res.json({
        success: true,
        ...cachedFilters,
        fromCache: true
      });
    }

    // Build base query
    const baseQuery = {
      isActive: true,
      isPublished: true
    };

    if (q) {
      baseQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        baseQuery.category = categoryDoc._id;
      }
    }

    // Get price range
    const priceStats = await Product.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    // Get categories with counts
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          let: { categoryId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$category', '$$categoryId'] },
                    { $eq: ['$isActive', true] },
                    { $eq: ['$isPublished', true] }
                  ]
                }
              }
            }
          ],
          as: 'categoryProducts'
        }
      },
      {
        $match: {
          isActive: true,
          'categoryProducts.0': { $exists: true } // Only categories with products
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          productCount: { $size: '$categoryProducts' }
        }
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 }
    ]);

    // Get brands/sellers
    const brands = await Product.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerInfo'
        }
      },
      { $unwind: '$sellerInfo' },
      {
        $group: {
          _id: '$seller',
          name: { $first: '$sellerInfo.name' },
          productCount: { $sum: 1 },
          storeName: { $first: '$sellerInfo.store.name' }
        }
      },
      { $match: { name: { $ne: null } } },
      { $sort: { productCount: -1 } },
      { $limit: 10 }
    ]);

    // Get rating distribution
    const ratingDistribution = await Product.aggregate([
      { $match: baseQuery },
      {
        $bucket: {
          groupBy: '$averageRating',
          boundaries: [0, 1, 2, 3, 4, 5],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    const filters = {
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 1000, avgPrice: 100 },
      categories,
      brands: brands.map(b => ({
        id: b._id,
        name: b.storeName || b.name,
        productCount: b.productCount
      })),
      ratingDistribution: ratingDistribution.filter(r => r._id !== 'Other'),
      availability: {
        inStock: await Product.countDocuments({ ...baseQuery, stock: { $gt: 0 } }),
        outOfStock: await Product.countDocuments({ ...baseQuery, stock: 0 })
      }
    };

    const response = {
      query: q || '',
      category: category || '',
      filters,
      timestamp: new Date()
    };

    // Cache for 10 minutes
    cache.set(cacheKey, response, 600);

    res.json({
      success: true,
      ...response,
      fromCache: false
    });
  } catch (error) {
    console.error('Get search filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get trending searches
 * @route   GET /api/search/trending
 * @access  Public
 */
exports.getTrendingSearches = async (req, res) => {
  try {
    const cacheKey = 'search:trending';
    const cachedTrending = cache.get(cacheKey);
    
    if (cachedTrending) {
      return res.json({
        success: true,
        ...cachedTrending,
        fromCache: true
      });
    }

    // In production, this would come from analytics database
    // For now, using pre-defined trending searches with some logic
    const trendingSearches = [
      { query: 'smartphone', count: 1250, type: 'category', trend: 'up' },
      { query: 'laptop', count: 980, type: 'category', trend: 'up' },
      { query: 'wireless headphones', count: 750, type: 'product', trend: 'up' },
      { query: 'fitness tracker', count: 620, type: 'product', trend: 'stable' },
      { query: 'gaming console', count: 540, type: 'category', trend: 'up' },
      { query: 'smart watch', count: 480, type: 'category', trend: 'down' },
      { query: 'bluetooth speaker', count: 420, type: 'product', trend: 'up' },
      { query: 'tablet', count: 380, type: 'category', trend: 'stable' }
    ];

    // Get recently boosted products as trending
    const boostedProducts = await Product.find({
      isActive: true,
      isPublished: true,
      isBoosted: true,
      boostExpiresAt: { $gt: new Date() }
    })
      .select('name slug price images category boostExpiresAt')
      .populate('category', 'name')
      .limit(5)
      .lean();

    const trendingProducts = boostedProducts.map(product => ({
      query: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images[0],
      category: product.category?.name,
      type: 'boosted',
      boostExpires: product.boostExpiresAt
    }));

    const response = {
      trendingSearches,
      trendingProducts,
      generatedAt: new Date(),
      period: 'last_24_hours'
    };

    // Cache for 15 minutes
    cache.set(cacheKey, response, 900);

    res.json({
      success: true,
      ...response,
      fromCache: false
    });
  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({
      success: true,
      trendingSearches: [],
      trendingProducts: []
    });
  }
};

/**
 * @desc    Record search analytics
 * @route   POST /api/search/analytics
 * @access  Public
 */
exports.recordSearch = async (req, res) => {
  try {
    const { query, resultsCount, filters, userId, sessionId } = req.body;

    // In production, this would save to an analytics database
    // For now, we'll just log and acknowledge

    console.log('Search recorded:', {
      query,
      resultsCount,
      filters,
      userId: userId || 'anonymous',
      sessionId: sessionId || req.sessionID,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Search recorded'
    });
  } catch (error) {
    console.error('Record search error:', error);
    // Don't fail the request if analytics fails
    res.json({
      success: true,
      message: 'Search recorded (analytics may be incomplete)'
    });
  }
};

// Helper functions
function buildProductQuery(q, category, minPrice, maxPrice, rating, inStock) {
  const query = {
    isActive: true,
    isPublished: true
  };

  // Search query
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
      { sku: { $regex: q, $options: 'i' } }
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Rating filter
  if (rating) {
    query.averageRating = { $gte: parseFloat(rating) };
  }

  // Stock filter
  if (inStock === 'true' || inStock === true) {
    query.stock = { $gt: 0 };
  }

  return query;
}

function getProductSort(sort) {
  switch (sort) {
    case 'relevance':
      return { isBoosted: -1, boostExpiresAt: -1, salesCount: -1 };
    case 'popular':
      return { salesCount: -1, averageRating: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'price-low':
      return { price: 1 };
    case 'price-high':
      return { price: -1 };
    case 'rating':
      return { averageRating: -1, reviewsCount: -1 };
    case 'boosted':
      return { isBoosted: -1, boostExpiresAt: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

function calculateRelevanceScore(product, query) {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // Name match (highest weight)
  if (product.name.toLowerCase().includes(queryLower)) {
    score += 100;
  }
  
  // Exact name match
  if (product.name.toLowerCase() === queryLower) {
    score += 50;
  }
  
  // Description match
  if (product.description && product.description.toLowerCase().includes(queryLower)) {
    score += 30;
  }
  
  // Tags match
  if (product.tags && product.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
    score += 20;
  }
  
  // Boost score for boosted products
  if (product.isBoosted) {
    score += 40;
  }
  
  // Score for popularity
  score += (product.salesCount || 0) * 0.1;
  
  // Score for rating
  score += (product.averageRating || 0) * 10;
  
  return Math.round(score);
}

function getPopularQueries(query) {
  // Pre-defined popular queries that match the search
  const allPopularQueries = [
    'electronics', 'clothing', 'home decor', 'beauty products',
    'sports equipment', 'books', 'toys', 'kitchen appliances',
    'furniture', 'jewelry', 'shoes', 'bags', 'watches'
  ];
  
  return allPopularQueries
    .filter(popularQuery => 
      popularQuery.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(popularQuery.toLowerCase())
    )
    .slice(0, 5);
}