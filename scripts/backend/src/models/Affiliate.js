// backend/src/models/Affiliate.js
const mongoose = require('mongoose');

const AffiliateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  affiliateCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  referralCode: {
    type: String,
    default: null,
    trim: true
  },
  
  commissionRate: {
    type: Number,
    default: 20, // 20% default commission
    min: 1,
    max: 50
  },
  
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  pendingWithdrawal: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalReferrals: {
    type: Number,
    default: 0
  },
  
  totalConversions: {
    type: Number,
    default: 0
  },
  
  totalClicks: {
    type: Number,
    default: 0
  },
  
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  generatedLinks: [{
    link: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    customPath: {
      type: String,
      default: null
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastClick: {
      type: Date,
      default: null
    },
    lastConversion: {
      type: Date,
      default: null
    }
  }],
  
  performance: {
    today: {
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 }
    },
    thisWeek: {
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 }
    },
    thisMonth: {
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 }
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'inactive'],
    default: 'active'
  },
  
  settings: {
    autoWithdraw: {
      type: Boolean,
      default: false
    },
    minimumPayout: {
      type: Number,
      default: 50
    },
    payoutMethod: {
      type: String,
      enum: ['paypal', 'bank', 'mobile', 'crypto', null],
      default: null
    },
    notificationEmail: {
      type: Boolean,
      default: true
    },
    notificationSMS: {
      type: Boolean,
      default: false
    }
  },
  
  taxInfo: {
    taxId: {
      type: String,
      default: null
    },
    country: {
      type: String,
      default: null
    },
    taxRate: {
      type: Number,
      default: 0
    }
  },
  
  metadata: {
    registrationSource: {
      type: String,
      enum: ['self', 'invited', 'admin', null],
      default: null
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Affiliate',
      default: null
    },
    customFields: {
      type: Map,
      of: String,
      default: {}
    }
  },
  
  // SEO fields
  seoTitle: {
    type: String,
    default: null
  },
  
  seoDescription: {
    type: String,
    default: null
  },
  
  // Timestamps
  joinedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActivity: {
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted earnings
AffiliateSchema.virtual('formattedEarnings').get(function() {
  return `$${this.totalEarnings.toFixed(2)}`;
});

// Virtual for formatted balance
AffiliateSchema.virtual('formattedBalance').get(function() {
  return `$${this.availableBalance.toFixed(2)}`;
});

// Virtual for conversion rate percentage
AffiliateSchema.virtual('conversionRatePercent').get(function() {
  if (this.totalClicks === 0) return '0%';
  return `${((this.totalConversions / this.totalClicks) * 100).toFixed(1)}%`;
});

// Indexes
AffiliateSchema.index({ affiliateCode: 1 }, { unique: true });
AffiliateSchema.index({ user: 1 }, { unique: true });
AffiliateSchema.index({ status: 1 });
AffiliateSchema.index({ totalEarnings: -1 });
AffiliateSchema.index({ joinedAt: -1 });
AffiliateSchema.index({ 'generatedLinks.createdAt': -1 });
AffiliateSchema.index({ referralCode: 1 });

// Pre-save middleware
AffiliateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate conversion rate
  if (this.totalClicks > 0) {
    this.conversionRate = (this.totalConversions / this.totalClicks) * 100;
  }
  
  next();
});

// Static method to find by affiliate code
AffiliateSchema.statics.findByCode = function(code) {
  return this.findOne({ affiliateCode: code.toUpperCase() });
};

// Static method to get top affiliates
AffiliateSchema.statics.getTopAffiliates = function(limit = 10, period = 'month') {
  const dateFilter = getDateFilter(period);
  
  return this.aggregate([
    {
      $match: {
        status: 'active',
        ...dateFilter
      }
    },
    {
      $sort: { totalEarnings: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    {
      $unwind: '$userDetails'
    },
    {
      $project: {
        affiliateCode: 1,
        totalEarnings: 1,
        totalReferrals: 1,
        conversionRate: 1,
        'userDetails.name': 1,
        'userDetails.email': 1,
        'userDetails.avatar': 1,
        joinedAt: 1
      }
    }
  ]);
};

// Instance method to generate report
AffiliateSchema.methods.generateReport = function(startDate, endDate) {
  return {
    affiliate: this.affiliateCode,
    period: { startDate, endDate },
    stats: {
      totalEarnings: this.totalEarnings,
      availableBalance: this.availableBalance,
      totalReferrals: this.totalReferrals,
      totalConversions: this.totalConversions,
      conversionRate: this.conversionRate
    },
    generatedAt: new Date()
  };
};

// Helper function for date filtering
function getDateFilter(period) {
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
  
  return { joinedAt: { $gte: startDate } };
}

module.exports = mongoose.model('Affiliate', AffiliateSchema);