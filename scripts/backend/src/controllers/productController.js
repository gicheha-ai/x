const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const Boost = require('../models/Boost');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Create a new product (Sellers only)
 */
exports.createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }

    // Check if user is a seller or admin
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only sellers can create products'
      });
    }

    const {
      name,
      description,
      price,
      category,
      subcategory,
      stock,
      images,
      specifications,
      tags,
      shippingInfo,
      returnPolicy,
      warranty
    } = req.body;

    // Check if seller has reached product limit (based on subscription)
    const seller = await User.findById(req.user.id);
    const productCount = await Product.countDocuments({ seller: req.user.id });
    
    let productLimit = 10; // Free tier limit
    
    if (seller.subscriptionTier === 'basic') {
      productLimit = 50;
    } else if (seller.subscriptionTier === 'pro') {
      productLimit = 1000; // Unlimited for pro
    }
    
    if (productCount >= productLimit && seller.subscriptionTier !== 'pro') {
      return res.status(403).json({
        status: 'error',
        message: `Product limit reached. Upgrade to ${seller.subscriptionTier === 'free' ? 'Basic' : 'Pro'} plan to add more products.`
      });
    }

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid category'
      });
    }

    // Create product
    const product = new Product({
      name,
      description,
      price,
      category,
      subcategory,
      stock,
      images: images || [],
      specifications: specifications || {},
      tags: tags || [],
      shippingInfo: shippingInfo || {},
      returnPolicy: returnPolicy || '30 days return policy',
      warranty: warranty || '1 year warranty',
      seller: req.user.id,
      isSuperAdminProduct: req.user.email === process.env.SUPER_ADMIN_EMAIL,
      status: 'draft'
    });

    await product.save();

    // If this is super admin product, automatically boost it
    if (req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      const boost = new Boost({
        product: product._id,
        seller: req.user.id,
        boostType: 'super-admin',
        duration: 'permanent',
        expiresAt: null,
        amount: 0 // Free for super admin
      });
      await boost.save();
      
      product.boostExpiry = null; // Never expires
      product.isBoosted = true;
      await product.save();
      
      logger.info(`Super admin product created and auto-boosted: ${product.name}`);
    }

    logger.info(`Product created: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create product'
    });
  }
};

/**
 * Get all products with filters and pagination
 */
exports.getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      category,
      subcategory,
      minPrice,
      maxPrice,
      rating,
      inStock,
      seller,
      search,
      boostedOnly = false
    } = req.query;

    // Build filter
    const filter = { status: 'active' };
    
    // Category filter
    if (category) {
      filter.category = category;
    }
    
    // Subcategory filter
    if (subcategory) {
      filter.subcategory = subcategory;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Rating filter
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }
    
    // Stock filter
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      filter.stock = 0;
    }
    
    // Seller filter
    if (seller) {
      filter.seller = seller;
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Boosted products only
    if (boostedOnly === 'true') {
      filter.isBoosted = true;
      filter.boostExpiry = { $gt: new Date() };
    }

    // Parse sort
    let sortOptions = {};
    const sortFields = sort.split(',');
    sortFields.forEach(field => {
      const order = field.startsWith('-') ? -1 : 1;
      const fieldName = field.replace(/^-/, '');
      sortOptions[fieldName] = order;
    });

    // Calculate skip
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await Product.countDocuments(filter);

    // Get products with ranking algorithm
    let products;
    
    // For super admin, show their products first
    if (req.user?.email === process.env.SUPER_ADMIN_EMAIL) {
      // Get super admin products first
      const superAdminProducts = await Product.find({
        ...filter,
        isSuperAdminProduct: true
      })
        .populate('seller', 'firstName lastName businessName email')
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      // Get other products
      const otherProductsFilter = {
        ...filter,
        isSuperAdminProduct: { $ne: true }
      };
      
      const otherProducts = await Product.find(otherProductsFilter)
        .populate('seller', 'firstName lastName businessName email')
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit) - superAdminProducts.length);

      products = [...superAdminProducts, ...otherProducts];
    } else {
      // Normal ranking for regular users
      products = await Product.find(filter)
        .populate('seller', 'firstName lastName businessName email')
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));
    }

    // Apply ranking algorithm (boosted products first, then by ranking score)
    products.sort((a, b) => {
      // Super admin products always first
      if (a.isSuperAdminProduct && !b.isSuperAdminProduct) return -1;
      if (!a.isSuperAdminProduct && b.isSuperAdminProduct) return 1;
      
      // Boosted products next
      const aIsBoosted = a.isBoosted && a.boostExpiry > new Date();
      const bIsBoosted = b.isBoosted && b.boostExpiry > new Date();
      
      if (aIsBoosted && !bIsBoosted) return -1;
      if (!aIsBoosted && bIsBoosted) return 1;
      
      // Then by ranking score
      return b.rankingScore - a.rankingScore;
    });

    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch products'
    });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    // Increment views
    await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

    const product = await Product.findById(productId)
      .populate('seller', 'firstName lastName businessName email rating totalSales')
      .populate('category', 'name slug')
      .populate('reviews.user', 'firstName lastName avatar');

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Get similar products
    const similarProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
      status: 'active'
    })
      .limit(6)
      .populate('seller', 'businessName')
      .select('name price images rating soldCount');

    // Get seller's other products
    const sellerProducts = await Product.find({
      seller: product.seller._id,
      _id: { $ne: productId },
      status: 'active'
    })
      .limit(4)
      .select('name price images');

    res.status(200).json({
      status: 'success',
      data: {
        product,
        similarProducts,
        sellerProducts,
        isBoosted: product.isBoosted && product.boostExpiry > new Date(),
        boostExpiry: product.boostExpiry,
        isSuperAdminProduct: product.isSuperAdminProduct
      }
    });
  } catch (error) {
    logger.error('Get product by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product'
    });
  }
};

/**
 * Update product (Owner or Admin only)
 */
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = product.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only update your own products.'
      });
    }

    // Admins cannot modify super admin products
    if (isAdmin && product.isSuperAdminProduct && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot modify super admin products'
      });
    }

    // Remove restricted fields
    delete updates.seller;
    delete updates.isSuperAdminProduct;
    delete updates.boostExpiry;
    delete updates.isBoosted;
    delete updates.rankingScore;

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('seller', 'firstName lastName businessName email')
      .populate('category', 'name slug');

    logger.info(`Product updated: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update product'
    });
  }
};

/**
 * Delete product (Owner or Admin only)
 */
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = product.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only delete your own products.'
      });
    }

    // Prevent deleting super admin products
    if (product.isSuperAdminProduct && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete super admin products'
      });
    }

    // Soft delete (change status to deleted)
    product.status = 'deleted';
    product.deletedAt = new Date();
    product.deletedBy = req.user.id;
    await product.save();

    // Also delete associated boosts
    await Boost.deleteMany({ product: productId });

    logger.info(`Product deleted: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete product'
    });
  }
};

/**
 * Get seller's products
 */
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.params.id || req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    // Build filter
    const filter = { seller: sellerId };
    
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: 'deleted' };
    }

    // Calculate skip
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await Product.countDocuments(filter);

    // Get products
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Get seller info
    const seller = await User.findById(sellerId)
      .select('firstName lastName businessName email subscriptionTier');

    // Get product statistics
    const stats = await Product.aggregate([
      { $match: { seller: mongoose.Types.ObjectId(sellerId), status: { $ne: 'deleted' } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        seller,
        products,
        stats: stats.reduce((acc, curr) => {
          acc[curr._id] = {
            count: curr.count,
            totalValue: curr.totalValue
          };
          return acc;
        }, {}),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get seller products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch seller products'
    });
  }
};

/**
 * Add product review
 */
exports.addReview = async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check if user has purchased this product
    const hasPurchased = true; // This would check order history
    
    if (!hasPurchased && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You must purchase this product before reviewing'
      });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );
    
    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating,
      comment,
      verifiedPurchase: hasPurchased
    });

    // Update average rating
    const totalReviews = product.reviews.length;
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating = totalRating / totalReviews;
    product.reviewCount = totalReviews;

    await product.save();

    logger.info(`Review added to product: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Review added successfully',
      data: { 
        review: {
          user: req.user.id,
          rating,
          comment,
          verifiedPurchase: hasPurchased,
          createdAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Add review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add review'
    });
  }
};

/**
 * Update product stock
 */
exports.updateStock = async (req, res) => {
  try {
    const productId = req.params.id;
    const { stock, action = 'set' } = req.body;

    if (!stock && stock !== 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Stock value is required'
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = product.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Update stock based on action
    let newStock;
    if (action === 'set') {
      newStock = parseInt(stock);
    } else if (action === 'add') {
      newStock = product.stock + parseInt(stock);
    } else if (action === 'subtract') {
      newStock = product.stock - parseInt(stock);
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action. Use: set, add, or subtract'
      });
    }

    // Validate new stock
    if (newStock < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Stock cannot be negative'
      });
    }

    product.stock = newStock;
    await product.save();

    logger.info(`Stock updated for product: ${product.name} to ${newStock} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Stock updated successfully',
      data: { stock: newStock }
    });
  } catch (error) {
    logger.error('Update stock error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update stock'
    });
  }
};

/**
 * Get trending products
 */
exports.getTrendingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get products with highest ranking score
    const products = await Product.find({
      status: 'active',
      stock: { $gt: 0 }
    })
      .sort({ 
        isBoosted: -1,
        boostExpiry: -1,
        rankingScore: -1,
        soldCount: -1 
      })
      .limit(limit)
      .populate('seller', 'businessName')
      .populate('category', 'name')
      .select('name price images rating soldCount views isBoosted');

    // Get boosted products separately (for super admin)
    const boostedProducts = await Product.find({
      isBoosted: true,
      boostExpiry: { $gt: new Date() },
      status: 'active'
    })
      .sort({ boostExpiry: -1 })
      .limit(5)
      .populate('seller', 'businessName')
      .select('name price images boostExpiry');

    res.status(200).json({
      status: 'success',
      data: {
        trending: products,
        boosted: boostedProducts,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get trending products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch trending products'
    });
  }
};

/**
 * Bulk update products (Seller or Admin only)
 */
exports.bulkUpdateProducts = async (req, res) => {
  try {
    const { action, productIds, data } = req.body;

    if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request. Provide action and product IDs.'
      });
    }

    // Get products to check permissions
    const products = await Product.find({ _id: { $in: productIds } });
    
    // Check permissions for all products
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    
    for (const product of products) {
      const isOwner = product.seller.toString() === req.user.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied for product: ${product.name}`
        });
      }
      
      // Admins cannot modify super admin products
      if (isAdmin && product.isSuperAdminProduct && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          status: 'error',
          message: `Cannot modify super admin product: ${product.name}`
        });
      }
    }

    let result;
    let message;

    switch (action) {
      case 'activate':
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { status: 'active' } }
        );
        message = `${result.modifiedCount} products activated`;
        break;

      case 'deactivate':
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { status: 'inactive' } }
        );
        message = `${result.modifiedCount} products deactivated`;
        break;

      case 'update-price':
        if (!data || !data.price) {
          return res.status(400).json({
            status: 'error',
            message: 'Price is required for update-price action'
          });
        }
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { price: parseFloat(data.price) } }
        );
        message = `${result.modifiedCount} products price updated`;
        break;

      case 'update-stock':
        if (!data || data.stock === undefined) {
          return res.status(400).json({
            status: 'error',
            message: 'Stock is required for update-stock action'
          });
        }
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { stock: parseInt(data.stock) } }
        );
        message = `${result.modifiedCount} products stock updated`;
        break;

      case 'update-category':
        if (!data || !data.category) {
          return res.status(400).json({
            status: 'error',
            message: 'Category is required for update-category action'
          });
        }
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { $set: { category: data.category } }
        );
        message = `${result.modifiedCount} products category updated`;
        break;

      case 'delete':
        // Soft delete
        result = await Product.updateMany(
          { _id: { $in: productIds } },
          { 
            $set: { 
              status: 'deleted',
              deletedAt: new Date(),
              deletedBy: req.user.id
            }
          }
        );
        message = `${result.modifiedCount} products deleted`;
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: `Invalid action: ${action}`
        });
    }

    logger.info(`Bulk product action: ${action} performed by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    logger.error('Bulk update products error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk actions'
    });
  }
};