// backend/src/models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Order Information (for verified purchases)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  
  // Review Content
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Review title cannot exceed 200 characters'],
    default: ''
  },
  
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Review comment must be at least 10 characters'],
    maxlength: [2000, 'Review comment cannot exceed 2000 characters']
  },
  
  // Review Media
  images: [{
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))|^\/.*/.test(v);
        },
        message: 'Please provide a valid image URL'
      }
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [100, 'Image caption cannot exceed 100 characters']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  videos: [{
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^(https?:\/\/.*\.(?:youtube\.com|youtu\.be|vimeo\.com))/.test(v);
        },
        message: 'Please provide a valid video URL (YouTube or Vimeo)'
      }
    },
    thumbnail: {
      type: String,
      default: null
    },
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'other'],
      default: 'youtube'
    }
  }],
  
  // Review Characteristics
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  
  helpful: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  unhelpful: {
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Seller Response
  sellerResponse: {
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Seller response cannot exceed 2000 characters']
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date,
      default: null
    },
    updatedAt: {
      type: Date,
      default: null
    }
  },
  
  // Admin Management
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged', 'edited'],
    default: 'pending'
  },
  
  rejectionReason: {
    type: String,
    enum: [
      'inappropriate_content',
      'fake_review',
      'contains_personal_info',
      'off_topic',
      'spam',
      'other',
      null
    ],
    default: null
  },
  
  rejectionDetails: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection details cannot exceed 500 characters']
  },
  
  flaggedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: [
        'inappropriate',
        'fake',
        'offensive',
        'spam',
        'conflict',
        'other'
      ]
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [200, 'Flag comment cannot exceed 200 characters']
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Review Metadata
  metadata: {
    purchaseDate: {
      type: Date,
      default: null
    },
    productVariant: {
      type: String,
      default: null
    },
    location: {
      country: {
        type: String,
        default: null
      },
      city: {
        type: String,
        default: null
      }
    },
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'other', null],
        default: null
      },
      os: {
        type: String,
        default: null
      },
      browser: {
        type: String,
        default: null
      }
    }
  },
  
  // Review Experience
  experience: {
    deliveryTime: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    packaging: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    productAccuracy: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    customerService: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  shareCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // SEO Fields
  helpfulScore: {
    type: Number,
    default: 0,
    min: 0
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
  
  // Soft Delete
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

// Virtual for helpful percentage
ReviewSchema.virtual('helpfulPercentage').get(function() {
  const totalVotes = this.helpful.count + this.unhelpful.count;
  if (totalVotes === 0) return 0;
  return Math.round((this.helpful.count / totalVotes) * 100);
});

// Virtual for review age
ReviewSchema.virtual('ageInDays').get(function() {
  const age = Date.now() - this.createdAt.getTime();
  return Math.floor(age / (1000 * 60 * 60 * 24));
});

// Virtual for formatted rating
ReviewSchema.virtual('formattedRating').get(function() {
  return `${this.rating}.0`;
});

// Virtual for summary (first 150 chars)
ReviewSchema.virtual('summary').get(function() {
  return this.comment.length > 150 
    ? this.comment.substring(0, 150) + '...' 
    : this.comment;
});

// Indexes
ReviewSchema.index({ product: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ verifiedPurchase: 1 });
ReviewSchema.index({ 'sellerResponse.respondedAt': -1 });
ReviewSchema.index({ helpfulScore: -1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ product: 1, user: 1 }, { unique: true }); // One review per product per user
ReviewSchema.index({ product: 1, status: 1, createdAt: -1 });

// Pre-save middleware
ReviewSchema.pre('save', function(next) {
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Calculate helpful score (weighted by recency and votes)
  const ageInDays = this.ageInDays;
  const recencyWeight = Math.max(0, 1 - (ageInDays / 365)); // Weight decreases over year
  const voteWeight = this.helpful.count - this.unhelpful.count;
  this.helpfulScore = Math.round((voteWeight + 1) * recencyWeight * 100);
  
  // Auto-approve reviews from verified purchases after 24 hours if not moderated
  if (this.status === 'pending' && 
      this.verifiedPurchase && 
      this.ageInDays >= 1 && 
      this.flaggedBy.length === 0) {
    this.status = 'approved';
  }
  
  next();
});

// Post-save middleware to update product rating
ReviewSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  
  if (this.status === 'approved' || this.status === 'edited') {
    // Calculate new average rating for the product
    const reviews = await this.model('Review').aggregate([
      {
        $match: {
          product: this.product,
          status: { $in: ['approved', 'edited'] }
        }
      },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewsCount: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);
    
    if (reviews.length > 0) {
      const reviewData = reviews[0];
      const ratingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };
      
      reviewData.ratingDistribution.forEach(rating => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
      
      await Product.findByIdAndUpdate(this.product, {
        averageRating: parseFloat(reviewData.averageRating.toFixed(1)),
        reviewsCount: reviewData.reviewsCount,
        ratingDistribution
      });
    }
  }
});

// Post-remove middleware to update product rating
ReviewSchema.post('remove', async function() {
  const Product = mongoose.model('Product');
  
  // Recalculate product rating
  const reviews = await this.model('Review').aggregate([
    {
      $match: {
        product: this.product,
        status: { $in: ['approved', 'edited'] }
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (reviews.length > 0) {
    const reviewData = reviews[0];
    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    reviewData.ratingDistribution.forEach(rating => {
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });
    
    await Product.findByIdAndUpdate(this.product, {
      averageRating: parseFloat(reviewData.averageRating.toFixed(1)),
      reviewsCount: reviewData.reviewsCount,
      ratingDistribution
    });
  } else {
    // No reviews left
    await Product.findByIdAndUpdate(this.product, {
      averageRating: 0,
      reviewsCount: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });
  }
});

// Static method to get product reviews with pagination
ReviewSchema.statics.getProductReviews = async function(productId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = 'helpful',
    rating = null,
    verified = null,
    hasMedia = null
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  const query = {
    product: productId,
    status: { $in: ['approved', 'edited'] }
  };
  
  if (rating) {
    query.rating = parseInt(rating);
  }
  
  if (verified !== null) {
    query.verifiedPurchase = verified === 'true';
  }
  
  if (hasMedia === 'true') {
    query.$or = [
      { 'images.0': { $exists: true } },
      { 'videos.0': { $exists: true } }
    ];
  }
  
  // Determine sort
  let sortOptions = {};
  switch (sort) {
    case 'newest':
      sortOptions = { createdAt: -1 };
      break;
    case 'oldest':
      sortOptions = { createdAt: 1 };
      break;
    case 'highest':
      sortOptions = { rating: -1, createdAt: -1 };
      break;
    case 'lowest':
      sortOptions = { rating: 1, createdAt: -1 };
      break;
    case 'helpful':
      sortOptions = { helpfulScore: -1, createdAt: -1 };
      break;
    default:
      sortOptions = { helpfulScore: -1, createdAt: -1 };
  }
  
  const [reviews, total] = await Promise.all([
    this.find(query)
      .populate('user', 'name avatar verified')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  // Get rating distribution
  const ratingDistribution = await this.aggregate([
    {
      $match: {
        product: productId,
        status: { $in: ['approved', 'edited'] }
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 }
    }
  ]);
  
  // Format rating distribution
  const distribution = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  };
  
  ratingDistribution.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  return {
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    ratingDistribution: distribution,
    hasMore: total > (skip + limit)
  };
};

// Static method to get user reviews
ReviewSchema.statics.getUserReviews = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status = null
  } = options;
  
  const skip = (page - 1) * limit;
  
  const query = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  const [reviews, total] = await Promise.all([
    this.find(query)
      .populate('product', 'name slug images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
};

// Static method to get helpful reviews
ReviewSchema.statics.getHelpfulReviews = async function(productId, limit = 3) {
  return this.find({
    product: productId,
    status: { $in: ['approved', 'edited'] },
    helpfulScore: { $gt: 0 }
  })
    .populate('user', 'name avatar verified')
    .sort({ helpfulScore: -1 })
    .limit(limit)
    .lean();
};

// Instance method to mark as helpful/unhelpful
ReviewSchema.methods.markHelpful = async function(userId) {
  // Check if user already voted
  const alreadyHelpful = this.helpful.users.some(id => id.toString() === userId.toString());
  const alreadyUnhelpful = this.unhelpful.users.some(id => id.toString() === userId.toString());
  
  if (alreadyHelpful) {
    // Remove helpful vote
    this.helpful.count = Math.max(0, this.helpful.count - 1);
    this.helpful.users = this.helpful.users.filter(id => id.toString() !== userId.toString());
  } else if (alreadyUnhelpful) {
    // Switch from unhelpful to helpful
    this.unhelpful.count = Math.max(0, this.unhelpful.count - 1);
    this.unhelpful.users = this.unhelpful.users.filter(id => id.toString() !== userId.toString());
    
    this.helpful.count += 1;
    this.helpful.users.push(userId);
  } else {
    // New helpful vote
    this.helpful.count += 1;
    this.helpful.users.push(userId);
  }
  
  await this.save();
  return { helpful: this.helpful.count, unhelpful: this.unhelpful.count };
};

ReviewSchema.methods.markUnhelpful = async function(userId) {
  // Check if user already voted
  const alreadyUnhelpful = this.unhelpful.users.some(id => id.toString() === userId.toString());
  const alreadyHelpful = this.helpful.users.some(id => id.toString() === userId.toString());
  
  if (alreadyUnhelpful) {
    // Remove unhelpful vote
    this.unhelpful.count = Math.max(0, this.unhelpful.count - 1);
    this.unhelpful.users = this.unhelpful.users.filter(id => id.toString() !== userId.toString());
  } else if (alreadyHelpful) {
    // Switch from helpful to unhelpful
    this.helpful.count = Math.max(0, this.helpful.count - 1);
    this.helpful.users = this.helpful.users.filter(id => id.toString() !== userId.toString());
    
    this.unhelpful.count += 1;
    this.unhelpful.users.push(userId);
  } else {
    // New unhelpful vote
    this.unhelpful.count += 1;
    this.unhelpful.users.push(userId);
  }
  
  await this.save();
  return { helpful: this.helpful.count, unhelpful: this.unhelpful.count };
};

// Instance method to flag review
ReviewSchema.methods.flagReview = async function(userId, reason, comment = '') {
  // Check if user already flagged
  const alreadyFlagged = this.flaggedBy.some(flag => 
    flag.user.toString() === userId.toString()
  );
  
  if (!alreadyFlagged) {
    this.flaggedBy.push({
      user: userId,
      reason,
      comment,
      flaggedAt: new Date()
    });
    
    // Auto-flag for admin review if multiple flags
    if (this.flaggedBy.length >= 3) {
      this.status = 'flagged';
    }
    
    await this.save();
  }
  
  return {
    flagged: !alreadyFlagged,
    flagCount: this.flaggedBy.length,
    status: this.status
  };
};

// Instance method to add seller response
ReviewSchema.methods.addSellerResponse = async function(userId, comment) {
  if (this.sellerResponse && this.sellerResponse.comment) {
    throw new Error('Seller has already responded to this review');
  }
  
  this.sellerResponse = {
    comment,
    respondedBy: userId,
    respondedAt: new Date(),
    updatedAt: new Date()
  };
  
  await this.save();
  return this.sellerResponse;
};

// Instance method to update seller response
ReviewSchema.methods.updateSellerResponse = async function(userId, comment) {
  if (!this.sellerResponse || !this.sellerResponse.comment) {
    throw new Error('No seller response to update');
  }
  
  if (this.sellerResponse.respondedBy.toString() !== userId.toString()) {
    throw new Error('Only the original responder can update the response');
  }
  
  this.sellerResponse.comment = comment;
  this.sellerResponse.updatedAt = new Date();
  
  await this.save();
  return this.sellerResponse;
};

module.exports = mongoose.model('Review', ReviewSchema);