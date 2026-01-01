// backend/src/models/Category.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    unique: true
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
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  image: {
    type: String,
    default: '/images/category-default.jpg',
    validate: {
      validator: function(v) {
        return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))|^\/.*/.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  
  banner: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))|^\/.*/.test(v);
      },
      message: 'Please provide a valid banner URL'
    }
  },
  
  icon: {
    type: String,
    default: null
  },
  
  // SEO fields
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
    trim: true
  }],
  
  // Display properties
  featured: {
    type: Boolean,
    default: false
  },
  
  orderLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Statistics (cached)
  productCount: {
    type: Number,
    default: 0
  },
  
  totalSales: {
    type: Number,
    default: 0
  },
  
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  // Affiliate settings
  affiliateCommission: {
    type: Number,
    default: 20, // 20% default commission for this category
    min: 0,
    max: 50
  },
  
  boostPrice: {
    daily: {
      type: Number,
      default: 10
    },
    weekly: {
      type: Number,
      default: 50
    },
    monthly: {
      type: Number,
      default: 150
    }
  },
  
  // Custom fields
  attributes: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'checkbox', 'color', 'size'],
      default: 'text'
    },
    options: [{
      type: String,
      trim: true
    }],
    required: {
      type: Boolean,
      default: false
    },
    filterable: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  
  // Category specifications
  specifications: {
    weightUnit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz', null],
      default: null
    },
    dimensionUnit: {
      type: String,
      enum: ['cm', 'm', 'inch', 'ft', null],
      default: null
    },
    warrantyUnit: {
      type: String,
      enum: ['days', 'months', 'years', null],
      default: null
    }
  },
  
  // Navigation settings
  showInMenu: {
    type: Boolean,
    default: true
  },
  
  showInFooter: {
    type: Boolean,
    default: false
  },
  
  menuPosition: {
    type: String,
    enum: ['header', 'sidebar', 'both', 'none'],
    default: 'header'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
  justOne: false
});

// Virtual for products
CategorySchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  justOne: false
});

// Virtual for featured products
CategorySchema.virtual('featuredProducts', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  justOne: false,
  match: { isFeatured: true, isActive: true }
});

// Virtual for boosted products
CategorySchema.virtual('boostedProducts', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  justOne: false,
  match: { 
    isBoosted: true, 
    isActive: true,
    boostExpiresAt: { $gt: new Date() }
  }
});

// Virtual for URL
CategorySchema.virtual('url').get(function() {
  return `/category/${this.slug}`;
});

// Virtual for admin URL
CategorySchema.virtual('adminUrl').get(function() {
  return `/admin/categories/${this._id}`;
});

// Virtual for breadcrumbs
CategorySchema.virtual('breadcrumbs').get(function() {
  const crumbs = [{ name: this.name, url: this.url }];
  return crumbs;
});

// Indexes
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ name: 1 }, { unique: true });
CategorySchema.index({ parentCategory: 1 });
CategorySchema.index({ featured: 1 });
CategorySchema.index({ orderLevel: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ productCount: -1 });
CategorySchema.index({ totalSales: -1 });
CategorySchema.index({ 'metaKeywords': 1 });
CategorySchema.index({ createdAt: -1 });
CategorySchema.index({ updatedAt: -1 });

// Pre-save middleware to generate slug
CategorySchema.pre('save', function(next) {
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
  
  // Generate meta fields if not provided
  if (!this.metaTitle) {
    this.metaTitle = this.name;
  }
  
  if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  next();
});

// Pre-remove middleware
CategorySchema.pre('remove', async function(next) {
  // Check if category has products
  const Product = mongoose.model('Product');
  const productCount = await Product.countDocuments({ category: this._id });
  
  if (productCount > 0) {
    throw new Error(`Cannot delete category with ${productCount} products. Move products first.`);
  }
  
  // Check if category has subcategories
  const subcategoryCount = await this.model('Category').countDocuments({ 
    parentCategory: this._id 
  });
  
  if (subcategoryCount > 0) {
    throw new Error(`Cannot delete category with ${subcategoryCount} subcategories. Delete subcategories first.`);
  }
  
  next();
});

// Static method to get category tree
CategorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .select('name slug parentCategory orderLevel productCount')
    .sort({ orderLevel: 1, name: 1 })
    .lean();
  
  const buildTree = (parentId = null) => {
    return categories
      .filter(category => 
        (parentId === null && !category.parentCategory) ||
        (category.parentCategory && category.parentCategory.toString() === parentId)
      )
      .map(category => ({
        ...category,
        children: buildTree(category._id.toString())
      }));
  };
  
  return buildTree();
};

// Static method to update product counts
CategorySchema.statics.updateProductCounts = async function() {
  const Product = mongoose.model('Product');
  const categories = await this.find({ isActive: true }).select('_id');
  
  for (const category of categories) {
    const productCount = await Product.countDocuments({
      category: category._id,
      isActive: true,
      isPublished: true
    });
    
    const salesStats = await Product.aggregate([
      {
        $match: {
          category: category._id,
          isActive: true,
          isPublished: true
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$salesCount' },
          avgRating: { $avg: '$averageRating' }
        }
      }
    ]);
    
    await this.findByIdAndUpdate(category._id, {
      productCount,
      totalSales: salesStats[0]?.totalSales || 0,
      averageRating: salesStats[0]?.avgRating || 0
    });
  }
  
  return { updated: categories.length };
};

// Static method to search categories
CategorySchema.statics.search = async function(query, options = {}) {
  const { 
    limit = 20, 
    skip = 0, 
    sort = { orderLevel: 1, name: 1 },
    fields = 'name slug description image productCount' 
  } = options;
  
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { slug: { $regex: query, $options: 'i' } },
      { metaKeywords: { $regex: query, $options: 'i' } }
    ]
  };
  
  const [categories, total] = await Promise.all([
    this.find(searchQuery)
      .select(fields)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(searchQuery)
  ]);
  
  return {
    categories,
    total,
    page: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(total / limit)
  };
};

// Instance method to get category path
CategorySchema.methods.getCategoryPath = async function() {
  const path = [];
  let currentCategory = this;
  
  while (currentCategory) {
    path.unshift({
      _id: currentCategory._id,
      name: currentCategory.name,
      slug: currentCategory.slug
    });
    
    if (currentCategory.parentCategory) {
      currentCategory = await this.model('Category').findById(currentCategory.parentCategory);
    } else {
      currentCategory = null;
    }
  }
  
  return path;
};

// Instance method to get sibling categories
CategorySchema.methods.getSiblingCategories = async function() {
  return this.model('Category').find({
    parentCategory: this.parentCategory,
    isActive: true,
    _id: { $ne: this._id }
  })
  .select('name slug image productCount')
  .sort({ orderLevel: 1, name: 1 })
  .lean();
};

module.exports = mongoose.model('Category', CategorySchema);