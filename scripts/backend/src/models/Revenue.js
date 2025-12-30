// backend/src/models/Revenue.js
const mongoose = require('mongoose');

const RevenueSchema = new mongoose.Schema({
  // Transaction Identification
  transactionId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Revenue Type
  type: {
    type: String,
    required: true,
    enum: [
      'boost',           // Product boosting revenue
      'commission',      // Transaction commission (8%)
      'affiliate',       // Affiliate commission (20%)
      'subscription',    // Seller subscription revenue
      'withdrawal',      // Affiliate/seller withdrawal
      'refund',          // Refund processed
      'deposit',         // User wallet deposit
      'fee',             // Platform fees
      'other'            // Other revenue
    ]
  },
  
  // Amount (positive for income, negative for expense/withdrawal)
  amount: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Source Details
  source: {
    type: {
      type: String,
      required: true,
      enum: ['product', 'order', 'user', 'affiliate', 'system', 'external']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'source.type',
      default: null
    },
    name: String,
    description: String
  },
  
  // Related Entities
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  affiliate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Affiliate',
    default: null
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['paypal', 'stripe', 'bank', 'mobile', 'wallet', 'cash', 'other', null],
    default: null
  },
  
  paymentDetails: {
    gateway: String,
    transactionId: String,
    account: String,
    reference: String,
    fees: Number
  },
  
  // Tracking for super admin links
  trackingLink: {
    type: String,
    default: null
  },
  
  linkId: {
    type: String,
    default: null
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Transaction Details
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Reconciliation
  reconciled: {
    type: Boolean,
    default: false
  },
  
  reconciledAt: {
    type: Date,
    default: null
  },
  
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Accounting
  accountingPeriod: {
    year: Number,
    month: Number,
    quarter: Number
  },
  
  category: {
    type: String,
    enum: [
      'sales',
      'services',
      'interest',
      'refunds',
      'expenses',
      'fees',
      'other_income',
      'other_expense'
    ],
    default: 'sales'
  },
  
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  netAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted amount
RevenueSchema.virtual('formattedAmount').get(function() {
  const sign = this.amount >= 0 ? '+' : '-';
  return `${sign}${this.currency} ${Math.abs(this.amount).toFixed(2)}`;
});

// Virtual for isIncome
RevenueSchema.virtual('isIncome').get(function() {
  return this.amount > 0;
});

// Virtual for isExpense
RevenueSchema.virtual('isExpense').get(function() {
  return this.amount < 0;
});

// Virtual for transaction age in days
RevenueSchema.virtual('ageInDays').get(function() {
  const age = Date.now() - this.createdAt.getTime();
  return Math.floor(age / (1000 * 60 * 60 * 24));
});

// Virtual for status color
RevenueSchema.virtual('statusColor').get(function() {
  const colors = {
    'completed': 'success',
    'pending': 'warning',
    'failed': 'danger',
    'cancelled': 'secondary',
    'refunded': 'info'
  };
  return colors[this.status] || 'secondary';
});

// Virtual for type icon
RevenueSchema.virtual('typeIcon').get(function() {
  const icons = {
    'boost': 'rocket',
    'commission': 'percentage',
    'affiliate': 'users',
    'subscription': 'credit-card',
    'withdrawal': 'arrow-up',
    'refund': 'arrow-left',
    'deposit': 'arrow-down',
    'fee': 'file-invoice-dollar',
    'other': 'money-bill-wave'
  };
  return icons[this.type] || 'money-bill-wave';
});

// Indexes
RevenueSchema.index({ transactionId: 1 }, { unique: true });
RevenueSchema.index({ type: 1 });
RevenueSchema.index({ status: 1 });
RevenueSchema.index({ createdAt: -1 });
RevenueSchema.index({ amount: -1 });
RevenueSchema.index({ 'source.id': 1 });
RevenueSchema.index({ user: 1 });
RevenueSchema.index({ seller: 1 });
RevenueSchema.index({ affiliate: 1 });
RevenueSchema.index({ order: 1 });
RevenueSchema.index({ product: 1 });
RevenueSchema.index({ trackingLink: 1 });
RevenueSchema.index({ linkId: 1 });
RevenueSchema.index({ 'accountingPeriod.year': 1, 'accountingPeriod.month': 1 });
RevenueSchema.index({ paymentMethod: 1 });

// Pre-save middleware to generate transaction ID
RevenueSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const typePrefix = this.type.substring(0, 3).toUpperCase();
    this.transactionId = `REV-${typePrefix}-${timestamp}-${random}`;
  }
  
  // Set accounting period
  if (this.isNew) {
    const date = new Date();
    this.accountingPeriod = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      quarter: Math.floor((date.getMonth() + 3) / 3)
    };
  }
  
  // Set processedAt for completed transactions
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  // Set completedAt for finalized transactions
  if (this.isModified('status') && ['completed', 'failed', 'cancelled'].includes(this.status) && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Calculate net amount
  this.netAmount = this.amount - this.taxAmount;
  
  next();
});

// Static method to record boost revenue
RevenueSchema.statics.recordBoostRevenue = async function(data) {
  const {
    product,
    seller,
    amount,
    duration,
    paymentMethod,
    transactionId,
    createdBy
  } = data;
  
  const revenue = await this.create({
    type: 'boost',
    amount,
    currency: 'USD',
    source: {
      type: 'product',
      id: product,
      name: 'Product Boost',
      description: `${duration} boost for product`
    },
    product,
    seller,
    paymentMethod,
    paymentDetails: {
      transactionId,
      gateway: paymentMethod
    },
    description: `Product boost: ${duration}`,
    status: 'completed',
    createdBy,
    category: 'services'
  });
  
  return revenue;
};

// Static method to record commission revenue
RevenueSchema.statics.recordCommissionRevenue = async function(data) {
  const {
    order,
    amount,
    seller,
    paymentMethod,
    transactionId
  } = data;
  
  const revenue = await this.create({
    type: 'commission',
    amount,
    currency: 'USD',
    source: {
      type: 'order',
      id: order,
      name: 'Transaction Commission',
      description: '8% platform commission'
    },
    order,
    seller,
    paymentMethod,
    paymentDetails: {
      transactionId,
      gateway: paymentMethod
    },
    description: `Platform commission for order`,
    status: 'completed',
    category: 'sales'
  });
  
  return revenue;
};

// Static method to record affiliate commission
RevenueSchema.statics.recordAffiliateCommission = async function(data) {
  const {
    order,
    amount,
    affiliate,
    product,
    paymentMethod,
    transactionId
  } = data;
  
  const revenue = await this.create({
    type: 'affiliate',
    amount,
    currency: 'USD',
    source: {
      type: 'affiliate',
      id: affiliate,
      name: 'Affiliate Commission',
      description: 'Affiliate referral commission'
    },
    order,
    affiliate,
    product,
    paymentMethod,
    paymentDetails: {
      transactionId,
      gateway: paymentMethod
    },
    description: `Affiliate commission for referral`,
    status: 'pending', // Will be paid after 30-day refund period
    category: 'sales'
  });
  
  return revenue;
};

// Static method to record subscription revenue
RevenueSchema.statics.recordSubscriptionRevenue = async function(data) {
  const {
    user,
    amount,
    tier,
    paymentMethod,
    transactionId,
    period
  } = data;
  
  const revenue = await this.create({
    type: 'subscription',
    amount,
    currency: 'USD',
    source: {
      type: 'user',
      id: user,
      name: 'Seller Subscription',
      description: `${tier} subscription`
    },
    user,
    paymentMethod,
    paymentDetails: {
      transactionId,
      gateway: paymentMethod
    },
    description: `${tier} subscription for ${period}`,
    status: 'completed',
    category: 'services'
  });
  
  return revenue;
};

// Static method to get revenue statistics
RevenueSchema.statics.getRevenueStats = async function(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate = new Date(),
    groupBy = 'day', // 'day', 'week', 'month', 'year'
    type = null,
    status = 'completed'
  } = options;
  
  // Build match query
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate },
    status
  };
  
  if (type) {
    matchQuery.type = type;
  }
  
  // Determine group format
  let dateFormat;
  switch (groupBy) {
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'week':
      dateFormat = '%Y-%U';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    case 'year':
      dateFormat = '%Y';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }
  
  const revenueByPeriod = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: '$createdAt'
          }
        },
        date: { $first: '$createdAt' },
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: '$amount' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
  
  // Get revenue by type
  const revenueByType = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$type',
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
  
  // Get revenue by payment method
  const revenueByPaymentMethod = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$paymentMethod',
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
  
  // Get top revenue sources
  const topSources = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$source.id',
        sourceType: { $first: '$source.type' },
        sourceName: { $first: '$source.name' },
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  // Calculate totals
  const totals = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgTransactionValue: { $avg: '$amount' },
        maxTransaction: { $max: '$amount' },
        minTransaction: { $min: '$amount' }
      }
    }
  ]);
  
  return {
    period: {
      startDate,
      endDate,
      groupBy
    },
    totals: totals[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      avgTransactionValue: 0,
      maxTransaction: 0,
      minTransaction: 0
    },
    revenueByPeriod,
    revenueByType,
    revenueByPaymentMethod,
    topSources,
    generatedAt: new Date()
  };
};

// Static method to get super admin revenue dashboard
RevenueSchema.statics.getSuperAdminDashboard = async function() {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const yesterdayStart = new Date(todayStart - 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get today's revenue
  const todayRevenue = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart },
        status: 'completed',
        amount: { $gt: 0 } // Only income
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get yesterday's revenue for comparison
  const yesterdayRevenue = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: yesterdayStart, $lt: todayStart },
        status: 'completed',
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get month-to-date revenue
  const monthRevenue = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: monthStart },
        status: 'completed',
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get all-time revenue
  const allTimeRevenue = await this.aggregate([
    {
      $match: {
        status: 'completed',
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get revenue by type for today
  const todayByType = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
  
  // Get active boosted products count
  const Product = mongoose.model('Product');
  const activeBoostedProducts = await Product.countDocuments({
    isBoosted: true,
    boostExpiresAt: { $gt: new Date() },
    isActive: true
  });
  
  // Get affiliate commissions generated
  const affiliateCommissions = await this.aggregate([
    {
      $match: {
        type: 'affiliate',
        status: { $in: ['completed', 'pending'] },
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get subscription revenue
  const subscriptionRevenue = await this.aggregate([
    {
      $match: {
        type: 'subscription',
        status: 'completed',
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Calculate growth percentage
  const yesterdayTotal = yesterdayRevenue[0]?.total || 0;
  const todayTotal = todayRevenue[0]?.total || 0;
  const growthPercentage = yesterdayTotal > 0 
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
    : (todayTotal > 0 ? 100 : 0);
  
  return {
    summary: {
      totalPlatformRevenue: allTimeRevenue[0]?.total || 0,
      todayRevenue: todayTotal,
      yesterdayRevenue: yesterdayTotal,
      growthPercentage: growthPercentage.toFixed(2),
      monthToDateRevenue: monthRevenue[0]?.total || 0,
      activeBoostedProducts,
      affiliateCommissionsGenerated: affiliateCommissions[0]?.total || 0,
      subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
      totalTransactions: allTimeRevenue[0]?.count || 0
    },
    todayBreakdown: todayByType,
    updatedAt: new Date()
  };
};

// Static method to get revenue by tracking link
RevenueSchema.statics.getRevenueByTrackingLink = async function(linkId) {
  return this.aggregate([
    {
      $match: {
        linkId,
        status: 'completed',
        amount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$linkId',
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: '$amount' },
        firstTransaction: { $min: '$createdAt' },
        lastTransaction: { $max: '$createdAt' }
      }
    }
  ]);
};

module.exports = mongoose.model('Revenue', RevenueSchema);