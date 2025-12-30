// backend/src/models/Boost.js
const mongoose = require('mongoose');

const BoostSchema = new mongoose.Schema({
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // Seller Information
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Boost Details
  boostType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: 'daily'
  },
  
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 365 // Maximum 365 days
  },
  
  durationUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks', 'months'],
    default: 'days'
  },
  
  // Boost Period
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  // Pricing
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['wallet', 'paypal', 'stripe', 'bank', 'mobile', 'free'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    refundedAt: Date,
    receiptUrl: String
  },
  
  // Boost Status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending', 'scheduled'],
    default: 'pending'
  },
  
  // Boost Performance
  performance: {
    viewsBefore: {
      type: Number,
      default: 0
    },
    viewsAfter: {
      type: Number,
      default: 0
    },
    clicksBefore: {
      type: Number,
      default: 0
    },
    clicksAfter: {
      type: Number,
      default: 0
    },
    salesBefore: {
      type: Number,
      default: 0
    },
    salesAfter: {
      type: Number,
      default: 0
    },
    revenueBefore: {
      type: Number,
      default: 0
    },
    revenueAfter: {
      type: Number,
      default: 0
    },
    conversionRateBefore: {
      type: Number,
      default: 0
    },
    conversionRateAfter: {
      type: Number,
      default: 0
    }
  },
  
  // Statistics
  stats: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averagePosition: {
      type: Number,
      default: 0
    },
    peakPosition: {
      type: Number,
      default: 0
    }
  },
  
  // Boost Position History
  positionHistory: [{
    position: Number,
    category: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Settings
  settings: {
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    regions: [String],
    devices: [{
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'all']
    }],
    schedule: {
      startTime: String, // HH:MM format
      endTime: String,   // HH:MM format
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }]
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  },
  
  // Auto-Renewal
  autoRenew: {
    enabled: {
      type: Boolean,
      default: false
    },
    nextRenewalDate: Date,
    renewalCount: {
      type: Number,
      default: 0
    },
    maxRenewals: {
      type: Number,
      default: 0
    }
  },
  
  // Campaign Information (for grouped boosts)
  campaign: {
    name: String,
    description: String,
    goal: {
      type: String,
      enum: ['visibility', 'sales', 'traffic', 'branding', 'other']
    },
    budget: Number,
    spent: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  metadata: {
    notes: String,
    tags: [String],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
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
  
  activatedAt: {
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

// Virtual for isActive
BoostSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
});

// Virtual for isExpired
BoostSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for timeRemaining
BoostSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now > this.endDate) return 0;
  
  return this.endDate.getTime() - now.getTime();
});

// Virtual for daysRemaining
BoostSchema.virtual('daysRemaining').get(function() {
  const ms = this.timeRemaining;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

// Virtual for hoursRemaining
BoostSchema.virtual('hoursRemaining').get(function() {
  const ms = this.timeRemaining;
  return Math.ceil(ms / (1000 * 60 * 60));
});

// Virtual for progressPercentage
BoostSchema.virtual('progressPercentage').get(function() {
  const totalDuration = this.endDate.getTime() - this.startDate.getTime();
  const elapsed = new Date().getTime() - this.startDate.getTime();
  
  if (totalDuration <= 0) return 100;
  
  const percentage = (elapsed / totalDuration) * 100;
  return Math.min(100, Math.max(0, percentage));
});

// Virtual for performanceImprovement
BoostSchema.virtual('performanceImprovement').get(function() {
  const improvements = {};
  
  // Views improvement
  if (this.performance.viewsBefore > 0) {
    improvements.views = ((this.performance.viewsAfter - this.performance.viewsBefore) / this.performance.viewsBefore) * 100;
  }
  
  // Sales improvement
  if (this.performance.salesBefore > 0) {
    improvements.sales = ((this.performance.salesAfter - this.performance.salesBefore) / this.performance.salesBefore) * 100;
  }
  
  // Revenue improvement
  if (this.performance.revenueBefore > 0) {
    improvements.revenue = ((this.performance.revenueAfter - this.performance.revenueBefore) / this.performance.revenueBefore) * 100;
  }
  
  // Conversion rate improvement
  if (this.performance.conversionRateBefore > 0) {
    improvements.conversionRate = ((this.performance.conversionRateAfter - this.performance.conversionRateBefore) / this.performance.conversionRateBefore) * 100;
  }
  
  return improvements;
});

// Virtual for ROI (Return on Investment)
BoostSchema.virtual('roi').get(function() {
  if (this.cost === 0) return 0;
  
  const additionalRevenue = this.performance.revenueAfter - this.performance.revenueBefore;
  return ((additionalRevenue - this.cost) / this.cost) * 100;
});

// Virtual for formattedCost
BoostSchema.virtual('formattedCost').get(function() {
  return `${this.currency} ${this.cost.toFixed(2)}`;
});

// Virtual for formattedRevenue
BoostSchema.virtual('formattedRevenue').get(function() {
  return `${this.currency} ${this.performance.revenueAfter.toFixed(2)}`;
});

// Indexes
BoostSchema.index({ product: 1 });
BoostSchema.index({ seller: 1 });
BoostSchema.index({ status: 1 });
BoostSchema.index({ startDate: 1 });
BoostSchema.index({ endDate: 1 });
BoostSchema.index({ 'payment.status': 1 });
BoostSchema.index({ createdAt: -1 });
BoostSchema.index({ 'stats.totalRevenue': -1 });
BoostSchema.index({ 'stats.totalSales': -1 });
BoostSchema.index({ boostType: 1 });
BoostSchema.index({ isActive: 1 });
BoostSchema.index({ 'campaign.name': 1 });

// Pre-save middleware to calculate end date
BoostSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('duration') || this.isModified('durationUnit') || this.isModified('startDate')) {
    // Calculate end date based on duration
    const endDate = new Date(this.startDate);
    
    switch (this.durationUnit) {
      case 'hours':
        endDate.setHours(endDate.getHours() + this.duration);
        break;
      case 'days':
        endDate.setDate(endDate.getDate() + this.duration);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + (this.duration * 7));
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + this.duration);
        break;
    }
    
    this.endDate = endDate;
  }
  
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Set boost type based on duration
  if (this.isNew && !this.boostType) {
    if (this.durationUnit === 'days' && this.duration === 1) {
      this.boostType = 'daily';
    } else if (this.durationUnit === 'days' && this.duration === 7) {
      this.boostType = 'weekly';
    } else if (this.durationUnit === 'days' && this.duration === 30) {
      this.boostType = 'monthly';
    } else {
      this.boostType = 'custom';
    }
  }
  
  // Update status based on dates
  const now = new Date();
  
  if (this.status === 'pending' && now >= this.startDate) {
    this.status = 'active';
    this.activatedAt = now;
  }
  
  if (this.status === 'active' && now > this.endDate) {
    this.status = 'expired';
  }
  
  // Calculate cost if not provided
  if (this.isNew && !this.cost) {
    this.cost = calculateBoostCost(this.boostType, this.duration);
  }
  
  // Set next renewal date for auto-renewal
  if (this.autoRenew.enabled && !this.autoRenew.nextRenewalDate) {
    this.autoRenew.nextRenewalDate = this.endDate;
  }
  
  next();
});

// Post-save middleware to update product boost status
BoostSchema.post('save', async function() {
  const Product = mongoose.model('Product');
  
  if (this.status === 'active') {
    // Update product boost status
    await Product.findByIdAndUpdate(this.product, {
      isBoosted: true,
      boostType: this.boostType,
      boostStartedAt: this.startDate,
      boostExpiresAt: this.endDate
    });
  } else if (['expired', 'cancelled'].includes(this.status)) {
    // Check if there are other active boosts for this product
    const activeBoosts = await this.model('Boost').countDocuments({
      product: this.product,
      status: 'active',
      _id: { $ne: this._id }
    });
    
    if (activeBoosts === 0) {
      // No other active boosts, remove boost from product
      await Product.findByIdAndUpdate(this.product, {
        isBoosted: false,
        boostType: null,
        boostStartedAt: null,
        boostExpiresAt: null
      });
    }
  }
});

// Method to activate boost
BoostSchema.methods.activate = async function() {
  if (this.status !== 'pending') {
    throw new Error(`Cannot activate boost in ${this.status} status`);
  }
  
  if (this.payment.status !== 'completed') {
    throw new Error('Payment must be completed before activating boost');
  }
  
  this.status = 'active';
  this.activatedAt = new Date();
  
  // Record initial performance metrics
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  
  if (product) {
    this.performance = {
      viewsBefore: product.viewCount,
      clicksBefore: product.clickCount,
      salesBefore: product.salesCount,
      revenueBefore: product.totalRevenue,
      conversionRateBefore: product.conversionRate,
      viewsAfter: product.viewCount,
      clicksAfter: product.clickCount,
      salesAfter: product.salesCount,
      revenueAfter: product.totalRevenue,
      conversionRateAfter: product.conversionRate
    };
  }
  
  return await this.save();
};

// Method to cancel boost
BoostSchema.methods.cancel = async function(refund = false) {
  if (!['pending', 'active'].includes(this.status)) {
    throw new Error(`Cannot cancel boost in ${this.status} status`);
  }
  
  this.status = 'cancelled';
  
  if (refund && this.payment.status === 'completed') {
    this.payment.status = 'refunded';
    this.payment.refundedAt = new Date();
    
    // Record refund in Revenue model
    const Revenue = mongoose.model('Revenue');
    
    await Revenue.create({
      type: 'refund',
      amount: -this.cost,
      currency: this.currency,
      source: {
        type: 'product',
        id: this.product,
        name: 'Boost Refund',
        description: `Refund for cancelled boost`
      },
      product: this.product,
      seller: this.seller,
      paymentMethod: this.payment.method,
      description: `Refund for cancelled boost`,
      status: 'completed',
      metadata: {
        boostId: this._id,
        refundReason: 'cancelled'
      }
    });
  }
  
  return await this.save();
};

// Method to record performance metrics
BoostSchema.methods.recordPerformance = async function() {
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.product);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Update performance metrics
  this.performance.viewsAfter = product.viewCount;
  this.performance.clicksAfter = product.clickCount;
  this.performance.salesAfter = product.salesCount;
  this.performance.revenueAfter = product.totalRevenue;
  this.performance.conversionRateAfter = product.conversionRate;
  
  // Update stats
  this.stats.totalViews = product.viewCount - (this.performance.viewsBefore || 0);
  this.stats.totalClicks = product.clickCount - (this.performance.clicksBefore || 0);
  this.stats.totalSales = product.salesCount - (this.performance.salesBefore || 0);
  this.stats.totalRevenue = product.totalRevenue - (this.performance.revenueBefore || 0);
  
  return await this.save();
};

// Method to record position
BoostSchema.methods.recordPosition = async function(position, category = 'all') {
  this.positionHistory.push({
    position,
    category,
    timestamp: new Date()
  });
  
  // Update average position
  if (this.positionHistory.length > 0) {
    const total = this.positionHistory.reduce((sum, record) => sum + record.position, 0);
    this.stats.averagePosition = total / this.positionHistory.length;
    
    // Update peak position
    if (position < this.stats.peakPosition || this.stats.peakPosition === 0) {
      this.stats.peakPosition = position;
    }
  }
  
  // Keep only last 100 position records
  if (this.positionHistory.length > 100) {
    this.positionHistory = this.positionHistory.slice(-100);
  }
  
  return await this.save();
};

// Method to renew boost
BoostSchema.methods.renew = async function() {
  if (!this.autoRenew.enabled) {
    throw new Error('Auto-renewal is not enabled');
  }
  
  if (this.autoRenew.maxRenewals > 0 && this.autoRenew.renewalCount >= this.autoRenew.maxRenewals) {
    throw new Error('Maximum renewals reached');
  }
  
  // Create new boost based on current settings
  const newBoost = await this.model('Boost').create({
    product: this.product,
    seller: this.seller,
    boostType: this.boostType,
    duration: this.duration,
    durationUnit: this.durationUnit,
    startDate: this.endDate,
    cost: this.cost,
    currency: this.currency,
    payment: {
      method: this.payment.method,
      status: 'pending'
    },
    status: 'scheduled',
    settings: this.settings,
    autoRenew: {
      enabled: this.autoRenew.enabled,
      renewalCount: this.autoRenew.renewalCount + 1,
      maxRenewals: this.autoRenew.maxRenewals
    },
    campaign: this.campaign,
    createdBy: this.createdBy
  });
  
  // Update renewal count
  this.autoRenew.renewalCount += 1;
  this.autoRenew.nextRenewalDate = newBoost.endDate;
  
  await this.save();
  
  return newBoost;
};

// Method to get boost analytics
BoostSchema.methods.getAnalytics = function() {
  const now = new Date();
  const durationMs = this.endDate.getTime() - this.startDate.getTime();
  const elapsedMs = now.getTime() - this.startDate.getTime();
  
  return {
    boostId: this._id,
    product: this.product,
    boostType: this.boostType,
    status: this.status,
    duration: {
      start: this.startDate,
      end: this.endDate,
      elapsed: elapsedMs,
      total: durationMs,
      remaining: this.timeRemaining,
      progress: this.progressPercentage
    },
    cost: {
      amount: this.cost,
      currency: this.currency,
      formatted: this.formattedCost
    },
    performance: {
      before: {
        views: this.performance.viewsBefore,
        clicks: this.performance.clicksBefore,
        sales: this.performance.salesBefore,
        revenue: this.performance.revenueBefore,
        conversionRate: this.performance.conversionRateBefore
      },
      after: {
        views: this.performance.viewsAfter,
        clicks: this.performance.clicksAfter,
        sales: this.performance.salesAfter,
        revenue: this.performance.revenueAfter,
        conversionRate: this.performance.conversionRateAfter
      },
      improvement: this.performanceImprovement,
      roi: this.roi
    },
    stats: this.stats,
    position: {
      average: this.stats.averagePosition,
      peak: this.stats.peakPosition,
      history: this.positionHistory.slice(-10) // Last 10 positions
    },
    autoRenew: this.autoRenew,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to get active boosts
BoostSchema.statics.getActiveBoosts = async function(options = {}) {
  const {
    sellerId = null,
    categoryId = null,
    limit = 50,
    page = 1
  } = options;
  
  const skip = (page - 1) * limit;
  const now = new Date();
  
  const query = {
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  };
  
  if (sellerId) {
    query.seller = sellerId;
  }
  
  if (categoryId) {
    query['settings.categories'] = categoryId;
  }
  
  const [boosts, total] = await Promise.all([
    this.find(query)
      .populate('product', 'name slug price images category')
      .populate('seller', 'name email avatar')
      .sort({ 'settings.priority': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    boosts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: total > (skip + limit)
  };
};

// Static method to get boost statistics
BoostSchema.statics.getBoostStats = async function(sellerId = null, period = 'month') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
  
  const matchQuery = {
    createdAt: { $gte: startDate }
  };
  
  if (sellerId) {
    matchQuery.seller = sellerId;
  }
  
  const stats = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalBoosts: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$performance.revenueAfter' },
        activeBoosts: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'active'] },
                { $lte: ['$startDate', new Date()] },
                { $gte: ['$endDate', new Date()] }
              ]},
              1,
              0
            ]
          }
        },
        completedBoosts: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        },
        avgROI: { $avg: '$roi' },
        avgDuration: { $avg: { $subtract: ['$endDate', '$startDate'] } }
      }
    }
  ]);
  
  // Get boost by type distribution
  const byType = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$boostType',
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$performance.revenueAfter' },
        avgROI: { $avg: '$roi' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  // Get top performing boosts
  const topPerforming = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $addFields: {
        netRevenue: { $subtract: ['$performance.revenueAfter', '$cost'] }
      }
    },
    {
      $sort: { netRevenue: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    {
      $unwind: '$productInfo'
    },
    {
      $project: {
        product: '$productInfo.name',
        boostType: 1,
        cost: 1,
        revenue: '$performance.revenueAfter',
        netRevenue: 1,
        roi: 1,
        duration: { $subtract: ['$endDate', '$startDate'] }
      }
    }
  ]);
  
  return {
    period,
    startDate,
    endDate: new Date(),
    stats: stats[0] || {
      totalBoosts: 0,
      totalCost: 0,
      totalRevenue: 0,
      activeBoosts: 0,
      completedBoosts: 0,
      avgROI: 0,
      avgDuration: 0
    },
    byType,
    topPerforming,
    generatedAt: new Date()
  };
};

// Static method to process auto-renewals
BoostSchema.statics.processAutoRenewals = async function() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  // Find boosts that need renewal
  const boostsToRenew = await this.find({
    'autoRenew.enabled': true,
    'autoRenew.nextRenewalDate': { $lte: oneHourFromNow },
    status: 'active',
    endDate: { $lte: oneHourFromNow }
  })
    .populate('seller', 'wallet')
    .lean();
  
  const results = {
    total: boostsToRenew.length,
    renewed: 0,
    failed: 0,
    details: []
  };
  
  for (const boost of boostsToRenew) {
    try {
      // Check if seller has sufficient balance
      if (boost.seller.wallet.balance < boost.cost) {
        results.details.push({
          boostId: boost._id,
          status: 'failed',
          reason: 'Insufficient wallet balance'
        });
        results.failed++;
        continue;
      }
      
      // Create renewal boost
      const renewedBoost = await this.create({
        product: boost.product,
        seller: boost.seller._id,
        boostType: boost.boostType,
        duration: boost.duration,
        durationUnit: boost.durationUnit,
        startDate: boost.endDate,
        cost: boost.cost,
        currency: boost.currency,
        payment: {
          method: 'wallet',
          status: 'completed',
          paidAt: new Date()
        },
        status: 'active',
        settings: boost.settings,
        autoRenew: {
          enabled: boost.autoRenew.enabled,
          renewalCount: boost.autoRenew.renewalCount + 1,
          maxRenewals: boost.autoRenew.maxRenewals
        },
        campaign: boost.campaign,
        createdBy: boost.createdBy
      });
      
      // Deduct from seller wallet
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(boost.seller._id, {
        $inc: { 'wallet.balance': -boost.cost }
      });
      
      // Record revenue
      const Revenue = mongoose.model('Revenue');
      await Revenue.recordBoostRevenue({
        product: boost.product,
        seller: boost.seller._id,
        amount: boost.cost,
        duration: boost.boostType,
        paymentMethod: 'wallet',
        transactionId: `RENEW-${boost._id}`,
        createdBy: boost.createdBy
      });
      
      // Update original boost
      await this.findByIdAndUpdate(boost._id, {
        $set: {
          'autoRenew.renewalCount': boost.autoRenew.renewalCount + 1,
          'autoRenew.nextRenewalDate': renewedBoost.endDate
        }
      });
      
      results.details.push({
        boostId: boost._id,
        renewedBoostId: renewedBoost._id,
        status: 'success',
        cost: boost.cost
      });
      results.renewed++;
      
    } catch (error) {
      console.error(`Error renewing boost ${boost._id}:`, error);
      results.details.push({
        boostId: boost._id,
        status: 'error',
        reason: error.message
      });
      results.failed++;
    }
  }
  
  return results;
};

// Helper function to calculate boost cost
function calculateBoostCost(boostType, duration = 1) {
  const baseRates = {
    'daily': 10,
    'weekly': 50,
    'monthly': 150,
    'custom': 5 // per day
  };
  
  let cost = baseRates[boostType] || baseRates.custom;
  
  if (boostType === 'custom') {
    cost = cost * duration;
  }
  
  return cost;
}

module.exports = mongoose.model('Boost', BoostSchema);