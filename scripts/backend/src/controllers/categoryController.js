// backend/src/controllers/categoryController.js
const Category = require('../models/Category');
const Product = require('../models/Product');
const { cache, invalidateCache } = require('../utils/cache');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getAllCategories = async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    const cachedCategories = cache.get(cacheKey);
    
    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories,
        fromCache: true
      });
    }

    const categories = await Category.find({ isActive: true })
      .select('name slug description image icon parentCategory featured orderLevel')
      .sort({ orderLevel: 1, createdAt: -1 })
      .lean();

    // Get product counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          isActive: true
        });
        
        // Get subcategories if any
        const subcategories = await Category.find({
          parentCategory: category._id,
          isActive: true
        })
          .select('name slug description image')
          .sort({ orderLevel: 1 })
          .lean();

        return {
          ...category,
          productCount,
          subcategories: subcategories.map(sub => ({
            ...sub,
            productCount: 0 // Will be populated if needed
          }))
        };
      })
    );

    // Cache for 1 hour
    cache.set(cacheKey, categoriesWithCounts, 3600);

    res.json({
      success: true,
      count: categoriesWithCounts.length,
      data: categoriesWithCounts,
      fromCache: false
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single category
 * @route   GET /api/categories/:slug
 * @access  Public
 */
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'boosted', minPrice, maxPrice, rating } = req.query;

    const cacheKey = `category:${slug}:page${page}:sort${sort}`;
    const cachedCategory = cache.get(cacheKey);
    
    if (cachedCategory) {
      return res.json({
        success: true,
        data: cachedCategory,
        fromCache: true
      });
    }

    const category = await Category.findOne({ 
      slug, 
      isActive: true 
    })
      .select('name slug description metaTitle metaDescription image banner parentCategory')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Build query for products
    const query = { 
      category: category._id, 
      isActive: true,
      isPublished: true 
    };

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.averageRating = { $gte: parseFloat(rating) };
    }

    // Sorting
    let sortOptions = {};
    switch (sort) {
      case 'boosted':
        sortOptions = { isBoosted: -1, boostExpiresAt: -1, createdAt: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'popular':
        sortOptions = { salesCount: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1, reviewsCount: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get products
    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .select('name slug price images averageRating reviewsCount salesCount isBoosted boostExpiresAt seller')
        .populate('seller', 'name rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    // Get subcategories
    const subcategories = await Category.find({
      parentCategory: category._id,
      isActive: true
    })
      .select('name slug description image productCount')
      .sort({ orderLevel: 1 })
      .lean();

    // Get product count for each subcategory
    await Promise.all(
      subcategories.map(async (subcategory) => {
        subcategory.productCount = await Product.countDocuments({
          category: subcategory._id,
          isActive: true
        });
      })
    );

    // Get category stats
    const stats = {
      totalProducts,
      averagePrice: 0,
      minPrice: Infinity,
      maxPrice: 0
    };

    if (products.length > 0) {
      const prices = products.map(p => p.price);
      stats.averagePrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
      stats.minPrice = Math.min(...prices);
      stats.maxPrice = Math.max(...prices);
    }

    const responseData = {
      category,
      products,
      subcategories,
      stats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts
      },
      filters: {
        sort,
        minPrice: minPrice || stats.minPrice,
        maxPrice: maxPrice || stats.maxPrice,
        rating: rating || null
      }
    };

    // Cache for 15 minutes
    cache.set(cacheKey, responseData, 900);

    res.json({
      success: true,
      data: responseData,
      fromCache: false
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private (Admin/Super Admin)
 */
exports.createCategory = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      parentCategory, 
      image, 
      banner, 
      icon,
      metaTitle, 
      metaDescription,
      featured = false,
      orderLevel = 0
    } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create category
    const category = await Category.create({
      name,
      slug,
      description,
      parentCategory: parentCategory || null,
      image,
      banner,
      icon,
      metaTitle: metaTitle || name,
      metaDescription: metaDescription || description?.substring(0, 160) || `Shop ${name} products online`,
      featured,
      orderLevel,
      createdBy: req.user.id
    });

    // Invalidate cache
    invalidateCache('categories:all');
    invalidateCache(`category:*`);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin/Super Admin)
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update fields
    const updates = req.body;
    
    // If name is being updated, regenerate slug
    if (updates.name && updates.name !== category.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Update category
    Object.assign(category, updates);
    category.updatedBy = req.user.id;
    category.updatedAt = new Date();

    await category.save();

    // Invalidate cache
    invalidateCache('categories:all');
    invalidateCache(`category:${category.slug}:*`);
    invalidateCache(`category:*`);

    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin/Super Admin)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productCount} products. Move products first.`
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parentCategory: id });
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${subcategoryCount} subcategories. Delete subcategories first.`
      });
    }

    // Soft delete (set inactive)
    category.isActive = false;
    category.updatedBy = req.user.id;
    category.updatedAt = new Date();
    await category.save();

    // Invalidate cache
    invalidateCache('categories:all');
    invalidateCache(`category:${category.slug}:*`);
    invalidateCache(`category:*`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get featured categories
 * @route   GET /api/categories/featured
 * @access  Public
 */
exports.getFeaturedCategories = async (req, res) => {
  try {
    const cacheKey = 'categories:featured';
    const cachedCategories = cache.get(cacheKey);
    
    if (cachedCategories) {
      return res.json({
        success: true,
        data: cachedCategories,
        fromCache: true
      });
    }

    const categories = await Category.find({ 
      isActive: true,
      featured: true 
    })
      .select('name slug description image icon banner productCount')
      .sort({ orderLevel: 1, updatedAt: -1 })
      .limit(8)
      .lean();

    // Get product counts and sample products for each category
    const featuredCategories = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          isActive: true
        });

        // Get 3 sample products
        const sampleProducts = await Product.find({
          category: category._id,
          isActive: true,
          isPublished: true
        })
          .select('name slug price images averageRating')
          .limit(3)
          .sort({ salesCount: -1 })
          .lean();

        return {
          ...category,
          productCount,
          sampleProducts
        };
      })
    );

    // Cache for 30 minutes
    cache.set(cacheKey, featuredCategories, 1800);

    res.json({
      success: true,
      count: featuredCategories.length,
      data: featuredCategories,
      fromCache: false
    });
  } catch (error) {
    console.error('Get featured categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get category hierarchy
 * @route   GET /api/categories/hierarchy
 * @access  Public
 */
exports.getCategoryHierarchy = async (req, res) => {
  try {
    const cacheKey = 'categories:hierarchy';
    const cachedHierarchy = cache.get(cacheKey);
    
    if (cachedHierarchy) {
      return res.json({
        success: true,
        data: cachedHierarchy,
        fromCache: true
      });
    }

    // Get all active categories
    const allCategories = await Category.find({ isActive: true })
      .select('name slug parentCategory orderLevel')
      .sort({ orderLevel: 1 })
      .lean();

    // Build hierarchy
    const buildHierarchy = (parentId = null) => {
      return allCategories
        .filter(category => 
          (parentId === null && !category.parentCategory) ||
          (category.parentCategory && category.parentCategory.toString() === parentId)
        )
        .map(category => ({
          ...category,
          children: buildHierarchy(category._id.toString())
        }));
    };

    const hierarchy = buildHierarchy();

    // Cache for 1 hour
    cache.set(cacheKey, hierarchy, 3600);

    res.json({
      success: true,
      data: hierarchy,
      fromCache: false
    });
  } catch (error) {
    console.error('Get category hierarchy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get category statistics
 * @route   GET /api/categories/stats
 * @access  Private (Admin/Super Admin)
 */
exports.getCategoryStats = async (req, res) => {
  try {
    const stats = await Category.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          productCount: { $size: '$products' },
          totalSales: { $sum: '$products.salesCount' },
          totalRevenue: {
            $sum: {
              $map: {
                input: '$products',
                as: 'product',
                in: { $multiply: ['$$product.price', '$$product.salesCount'] }
              }
            }
          },
          averageRating: { $avg: '$products.averageRating' },
          boostedProducts: {
            $size: {
              $filter: {
                input: '$products',
                as: 'product',
                cond: { $eq: ['$$product.isBoosted', true] }
              }
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Calculate platform totals
    const platformStats = {
      totalCategories: stats.length,
      totalProducts: stats.reduce((sum, cat) => sum + cat.productCount, 0),
      totalSales: stats.reduce((sum, cat) => sum + cat.totalSales, 0),
      totalRevenue: stats.reduce((sum, cat) => sum + cat.totalRevenue, 0),
      averageProductsPerCategory: stats.length > 0 
        ? (stats.reduce((sum, cat) => sum + cat.productCount, 0) / stats.length).toFixed(1) 
        : 0
    };

    res.json({
      success: true,
      data: {
        categories: stats,
        platformStats,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Bulk update categories order
 * @route   PUT /api/categories/bulk-order
 * @access  Private (Admin/Super Admin)
 */
exports.bulkUpdateOrder = async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, orderLevel }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Categories array is required'
      });
    }

    const bulkOps = categories.map(({ id, orderLevel }) => ({
      updateOne: {
        filter: { _id: id },
        update: { 
          $set: { 
            orderLevel,
            updatedBy: req.user.id,
            updatedAt: new Date()
          }
        }
      }
    }));

    const result = await Category.bulkWrite(bulkOps);

    // Invalidate cache
    invalidateCache('categories:all');
    invalidateCache('categories:featured');
    invalidateCache('categories:hierarchy');
    invalidateCache('category:*');

    res.json({
      success: true,
      data: result,
      message: 'Categories order updated successfully'
    });
  } catch (error) {
    console.error('Bulk update categories order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Search categories
 * @route   GET /api/categories/search
 * @access  Public
 */
exports.searchCategories = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const categories = await Category.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } }
      ]
    })
      .select('name slug description image productCount')
      .limit(parseInt(limit))
      .lean();

    // Get product counts
    await Promise.all(
      categories.map(async (category) => {
        category.productCount = await Product.countDocuments({
          category: category._id,
          isActive: true
        });
      })
    );

    res.json({
      success: true,
      data: categories,
      count: categories.length,
      query: q
    });
  } catch (error) {
    console.error('Search categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};