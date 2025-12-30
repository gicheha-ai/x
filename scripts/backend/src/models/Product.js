// backend/src/models/Product.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const ProductSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  
  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Category Information
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  comparePrice: {
    type: Number,
    default: null,
    min: [0, 'Compare price cannot be negative']
  },
  
  costPrice: {
    type: Number,
    default: null,
    min: [0, 'Cost price cannot be negative']
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Inventory
  sku: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  
  barcode: {
    type: String,
    trim: true
  },
  
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Low stock threshold cannot be negative']
  },
  
  manageStock: {
    type: Boolean,
    default: true
  },
  
  allowBackorders: {
    type: Boolean,
    default: false
  },
  
  // Product Variations
  hasVariations: {
    type: Boolean,
    default: false
  },
  
  variations: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      value: String,
      price: Number,
      sku: String,
      stock: Number,
      image: String
    }]
  }],
  
  defaultVariant: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Product Attributes
  attributes: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    unit: String
  }],
  
  specifications: [{
    key: String,
    value: String
  }],
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  videos: [{
    url: String,
    thumbnail: String,
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'other']
    }
  }],
  
  // Boost System
  isBoosted: {
    type: Boolean,
    default: false
  },
  
  boostType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', null],
    default: null
  },
  
  boostStartedAt: {
    type: Date,
    default: null
  },
  
  boostExpiresAt: {
    type: Date,
    default: null
  },
  
  boostHistory: [{
    type: String,
    duration: String,
    cost: Number,
    startedAt: Date,
    expiresAt: Date,
    transactionId: String
  }],
  
  // Affiliate Settings
  affiliateCommission: {
    type: Number,
    default: 20, // 20% default commission
    min: 0,
    max: 50
  },
  
  // SEO Fields
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  
  metaKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Product Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'out_of_stock'],
    default: 'draft'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  isNew: {
    type: Boolean,
    default: true
  },
  
  // Shipping Information
  weight: {
    type: Number,
    default: 0,
    min: [0, 'Weight cannot be negative']
  },
  
  weightUnit: {
    type: String,
    enum: ['g', 'kg', 'lb', 'oz'],
    default: 'kg'
  },
  
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'm', 'in', 'ft'],
      default: 'cm'
    }
  },
  
  shippingClass: {
    type: String,
    default: 'standard'
  },
  
  // Reviews and Ratings
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  reviewsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  ratingDistribution: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 }
  },
  
  // Sales Statistics
  salesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lastSoldAt: {
    type: Date,
    default: null
  },
  
  // Views and Analytics
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  clickCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Product Relationships
  relatedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  crossSellProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  upSellProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  publishedAt: {
    type: Date,
    default: null
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual for formatted price
ProductSchema.virtual('formattedPrice').get(function() {
  return `${this.currency} ${this.price.toFixed(2)}`;
});

// Virtual for formatted compare price
ProductSchema.virtual('formattedComparePrice').get(function() {
  if (!this.comparePrice) return null;
  return `${this.currency} ${this.comparePrice.toFixed(2)}`;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (this.stock <= 0 && !this.allowBackorders) {
    return 'out_of_stock';
  } else if (this.stock <= this.lowStockThreshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
});

// Virtual for product URL
ProductSchema.virtual('url').get(function() {
  return `/product/${this.slug}`;
});

// Virtual for admin URL
ProductSchema.virtual('adminUrl').get(function() {
  return `/admin/products/${this._id}`;
});

// Virtual for primary image
ProductSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : '/images/product-placeholder.jpg');
});

// Virtual for boost status
ProductSchema.virtual('boostStatus').get(function() {
  if (!this.isBoosted || !this.boostExpiresAt) return 'not_boosted';
  
  const now = new Date();
  if (now > this.boostExpiresAt) return 'expired';
  
  const hoursLeft = Math.ceil((this.boostExpiresAt - now) / (1000 * 60 * 60));
  if (hoursLeft < 24) return 'expiring_soon';
  
  return 'active';
});

// Indexes
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ sku: 1 }, { sparse: true });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ subcategory: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ averageRating: -1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });
ProductSchema.index({ isBoosted: -1, boostExpiresAt: -1 });
ProductSchema.index({ isFeatured: -1 });
ProductSchema.index({ isActive: 1, status: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ 'metaKeywords': 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Pre-save middleware to generate slug
ProductSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true
    });
  }
  
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
    this.isNew = true;
  }
  
  // Auto-set status based on stock
  if (this.isModified('stock') && this.stock <= 0 && !this.allowBackorders) {
    this.status = 'out_of_stock';
  }
  
  // Generate SKU if not provided
  if (!this.sku) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.sku = `SKU-${timestamp}-${random}`;
  }
  
  // Set meta fields if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.name.substring(0, 60);
  }
  
  if (!this.metaDescription && this.shortDescription) {
    this.metaDescription = this.shortDescription.substring(0, 160);
  } else if (!this.metaDescription) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  next();
});

// Pre-save middleware for super admin products
ProductSchema.pre('save', async function(next) {
  // If this is a super admin product, ensure it gets top ranking
  if (this.seller) {
    const User = mongoose.model('User');
    const seller = await User.findById(this.seller);
    
    if (seller && (seller.email === process.env.SUPER_ADMIN_EMAIL || seller.role === 'super-admin')) {
      // Super admin products are always boosted
      this.isBoosted = true;
      this.isFeatured = true;
      
      // Set boost to never expire for super admin
      if (!this.boostExpiresAt) {
        this.boostExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        this.boostType = 'monthly';
        this.boostStartedAt = new Date();
      }
    }
  }
  
  next();
});

// Static method to get trending products
ProductSchema.statics.getTrendingProducts = async function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        status: 'published'
      }
    },
    {
      $addFields: {
        trendScore: {
          $add: [
            { $multiply: ['$salesCount', 2] },
            { $multiply: ['$viewCount', 0.1] },
            { $multiply: ['$averageRating', 10] },
            { $cond: [{ $eq: ['$isBoosted', true] }, 50, 0] }
          ]
        }
      }
    },
    {
      $sort: { trendScore: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'sellerInfo'
      }
    },
    {
      $unwind: '$sellerInfo'
    },
    {
      $project: {
        name: 1,
        slug: 1,
        price: 1,
        images: 1,
        averageRating: 1,
        salesCount: 1,
        isBoosted: 1,
        'sellerInfo.name': 1,
        'sellerInfo.avatar': 1,
        trendScore: 1
      }
    }
  ]);
};

// Static method to get boosted products
ProductSchema.statics.getBoostedProducts = async function(limit = 20) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    status: 'published',
    isBoosted: true,
    boostExpiresAt: { $gt: now }
  })
    .select('name slug price images averageRating salesCount isBoosted boostExpiresAt seller')
    .populate('seller', 'name avatar')
    .sort({ boostExpiresAt: 1, salesCount: -1 })
    .limit(limit)
    .lean();
};

// Static method to search products
ProductSchema.statics.searchProducts = async function(query, options = {}) {
  const {
    page = 1,
    limit = 20,
    category = null,
    minPrice = null,
    maxPrice = null,
    rating = null,
    sort = 'relevance',
    inStock = true
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build search query
  const searchQuery = {
    isActive: true,
    status: 'published',
    $text: { $search: query }
  };
  
  // Add filters
  if (category) {
    searchQuery.category = category;
  }
  
  if (minPrice || maxPrice) {
    searchQuery.price = {};
    if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
    if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
  }
  
  if (rating) {
    searchQuery.averageRating = { $gte: parseFloat(rating) };
  }
  
  if (inStock) {
    searchQuery.stock = { $gt: 0 };
  }
  
  // Determine sort
  let sortOptions = {};
  switch (sort) {
    case 'relevance':
      sortOptions = { score: { $meta: 'textScore' }, isBoosted: -1, salesCount: -1 };
      break;
    case 'price-low':
      sortOptions = { price: 1 };
      break;
    case 'price-high':
      sortOptions = { price: -1 };
      break;
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'popular':
      sortOptions = { salesCount: -1 };
      break;
    case 'rating':
      sortOptions = { averageRating: -1, reviewsCount: -1 };
      break;
    default:
      sortOptions = { score: { $meta: 'textScore' } };
  }
  
  const [products, total] = await Promise.all([
    this.find(searchQuery)
      .select({
        name: 1,
        slug: 1,
        price: 1,
        images: 1,
        averageRating: 1,
        salesCount: 1,
        isBoosted: 1,
        seller: 1,
        score: { $meta: 'textScore' }
      })
      .populate('seller', 'name avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(searchQuery)
  ]);
  
  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: total > (skip + limit)
  };
};

// Instance method to increment views
ProductSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  
  // Update conversion rate
  if (this.viewCount > 0 && this.salesCount > 0) {
    this.conversionRate = (this.salesCount / this.viewCount) * 100;
  }
  
  return await this.save();
};

// Instance method to record sale
ProductSchema.methods.recordSale = async function(quantity, revenue) {
  this.salesCount += quantity;
  this.totalRevenue += revenue;
  this.lastSoldAt = new Date();
  
  // Update stock if manageStock is true
  if (this.manageStock && this.stock >= quantity) {
    this.stock -= quantity;
    
    // Update status if out of stock
    if (this.stock <= 0 && !this.allowBackorders) {
      this.status = 'out_of_stock';
    } else if (this.stock <= this.lowStockThreshold) {
      this.status = 'published'; // Ensure it's still published
    }
  }
  
  // Update conversion rate
  if (this.viewCount > 0) {
    this.conversionRate = (this.salesCount / this.viewCount) * 100;
  }
  
  return await this.save();
};

// Instance method to boost product
ProductSchema.methods.boostProduct = async function(duration, cost, transactionId = null) {
  const now = new Date();
  let expiresAt = new Date(now);
  
  switch (duration) {
    case 'daily':
      expiresAt.setDate(expiresAt.getDate() + 1);
      break;
    case 'weekly':
      expiresAt.setDate(expiresAt.getDate() + 7);
      break;
    case 'monthly':
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    default:
      expiresAt.setDate(expiresAt.getDate() + 1);
  }
  
  this.isBoosted = true;
  this.boostType = duration;
  this.boostStartedAt = now;
  this.boostExpiresAt = expiresAt;
  
  // Record in boost history
  this.boostHistory.push({
    type: duration,
    duration,
    cost,
    startedAt: now,
    expiresAt,
    transactionId
  });
  
  // Keep only last 10 boost records
  if (this.boostHistory.length > 10) {
    this.boostHistory = this.boostHistory.slice(-10);
  }
  
  return await this.save();
};

module.exports = mongoose.model('Product', ProductSchema);