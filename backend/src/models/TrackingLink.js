// backend/src/models/TrackingLink.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const TrackingLinkSchema = new mongoose.Schema({
  // Link Identification
  linkId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Link Details
  link: {
    type: String,
    required: true,
    trim: true
  },
  
  shortLink: {
    type: String,
    trim: true
  },
  
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  // Creator Information
  generatedBy: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Link Type
  type: {
    type: String,
    enum: ['super-admin', 'affiliate', 'campaign', 'promotion', 'social', 'email', 'other'],
    default: 'super-admin'
  },
  
  // Campaign Information
  campaign: {
    name: String,
    source: String,
    medium: String,
    content: String,
    term: String
  },
  
  // Target Information
  target: {
    url: String,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    action: {
      type: String,
      enum: ['purchase', 'signup', 'download', 'view', 'click', 'other'],
      default: 'purchase'
    }
  },
  
  // Tracking Parameters
  parameters: {
    type: Map,
    of: String,
    default: {}
  },
  
  // Analytics
  analytics: {
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueClicks: {
      type: Number,
      default: 0,
      min: 0
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0
    },
    revenue: {
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
    
    // Geographic Data
    countries: [{
      country: String,
      clicks: Number,
      conversions: Number,
      revenue: Number
    }],
    
    // Device Data
    devices: [{
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'other']
      },
      clicks: Number,
      conversions: Number
    }],
    
    // Referrer Data
    referrers: [{
      domain: String,
      clicks: Number,
      conversions: Number
    }],
    
    // Time-based Data
    hourlyClicks: [{
      hour: Number,
      clicks: Number
    }],
    
    dailyStats: [{
      date: Date,
      clicks: Number,
      conversions: Number,
      revenue: Number
    }]
  },
  
  // Click Logs
  clickLogs: [{
    ip: String,
    userAgent: String,
    country: String,
    city: String,
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'other']
    },
    browser: String,
    os: String,
    referrer: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    converted: {
      type: Boolean,
      default: false
    },
    conversionValue: {
      type: Number,
      default: 0
    },
    sessionId: String
  }],
  
  // Expiration
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'paused', 'deleted'],
    default: 'active'
  },
  
  // Settings
  settings: {
    trackClicks: {
      type: Boolean,
      default: true
    },
    trackConversions: {
      type: Boolean,
      default: true
    },
    trackRevenue: {
      type: Boolean,
      default: true
    },
    trackGeolocation: {
      type: Boolean,
      default: true
    },
    trackDevices: {
      type: Boolean,
      default: true
    },
    trackReferrers: {
      type: Boolean,
      default: true
    },
    requireUTM: {
      type: Boolean,
      default: false
    },
    autoExpire: {
      type: Boolean,
      default: true
    }
  },
  
  // Metadata
  metadata: {
    description: String,
    tags: [String],
    notes: String,
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
  
  lastClick: {
    type: Date,
    default: null
  },
  
  lastConversion: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for isExpired
TrackingLinkSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for daysRemaining
TrackingLinkSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  if (now > this.expiresAt) return 0;
  
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for hoursRemaining
TrackingLinkSchema.virtual('hoursRemaining').get(function() {
  const now = new Date();
  if (now > this.expiresAt) return 0;
  
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60));
});

// Virtual for clickThroughRate
TrackingLinkSchema.virtual('clickThroughRate').get(function() {
  if (this.analytics.clicks === 0) return 0;
  return (this.analytics.conversions / this.analytics.clicks) * 100;
});

// Virtual for averageOrderValue
TrackingLinkSchema.virtual('averageOrderValue').get(function() {
  if (this.analytics.conversions === 0) return 0;
  return this.analytics.revenue / this.analytics.conversions;
});

// Virtual for revenuePerClick
TrackingLinkSchema.virtual('revenuePerClick').get(function() {
  if (this.analytics.clicks === 0) return 0;
  return this.analytics.revenue / this.analytics.clicks;
});

// Virtual for formattedRevenue
TrackingLinkSchema.virtual('formattedRevenue').get(function() {
  return `$${this.analytics.revenue.toFixed(2)}`;
});

// Virtual for QR Code URL
TrackingLinkSchema.virtual('qrCodeUrl').get(function() {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(this.link)}`;
});

// Indexes
TrackingLinkSchema.index({ linkId: 1 }, { unique: true });
TrackingLinkSchema.index({ token: 1 }, { unique: true });
TrackingLinkSchema.index({ generatedBy: 1 });
TrackingLinkSchema.index({ type: 1 });
TrackingLinkSchema.index({ status: 1 });
TrackingLinkSchema.index({ expiresAt: 1 });
TrackingLinkSchema.index({ 'target.product': 1 });
TrackingLinkSchema.index({ 'campaign.name': 1 });
TrackingLinkSchema.index({ createdAt: -1 });
TrackingLinkSchema.index({ 'analytics.revenue': -1 });
TrackingLinkSchema.index({ 'analytics.clicks': -1 });
TrackingLinkSchema.index({ userId: 1 });

// Pre-save middleware to generate token and link
TrackingLinkSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate unique token
    if (!this.token) {
      this.token = crypto.randomBytes(16).toString('hex');
    }
    
    // Generate link ID
    if (!this.linkId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      this.linkId = `LINK-${timestamp}-${random}`;
    }
    
    // Generate tracking link
    if (!this.link) {
      const baseUrl = process.env.FRONTEND_URL || 'https://yourecommerce.com';
      
      // Build UTM parameters
      const utmParams = new URLSearchParams();
      utmParams.append('ref', this.linkId);
      utmParams.append('source', this.campaign?.source || 'direct');
      utmParams.append('medium', this.campaign?.medium || 'link');
      utmParams.append('campaign', this.campaign?.name || this.linkId);
      
      if (this.campaign?.content) {
        utmParams.append('content', this.campaign.content);
      }
      
      if (this.campaign?.term) {
        utmParams.append('term', this.campaign.term);
      }
      
      // Build target URL
      let targetUrl = this.target.url || `${baseUrl}/`;
      
      // Add product parameter if target is a product
      if (this.target.product) {
        const Product = mongoose.model('Product');
        // In production, you would fetch the product slug here
        targetUrl = `${baseUrl}/product/[product-slug]`;
      }
      
      // Add tracking parameters
      const separator = targetUrl.includes('?') ? '&' : '?';
      this.link = `${targetUrl}${separator}${utmParams.toString()}`;
    }
    
    // Generate short link
    if (!this.shortLink) {
      const shortCode = this.linkId.substring(0, 8).toLowerCase();
      this.shortLink = `${process.env.SHORT_DOMAIN || 'yourecommerce.com'}/l/${shortCode}`;
    }
    
    // Set expiration (24 hours for super admin links)
    if (!this.expiresAt && this.type === 'super-admin') {
      this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
  
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Update conversion rate
  if (this.isModified('analytics.clicks') || this.isModified('analytics.conversions')) {
    if (this.analytics.clicks > 0) {
      this.analytics.conversionRate = (this.analytics.conversions / this.analytics.clicks) * 100;
    }
  }
  
  // Update status based on expiration
  if (this.isExpired && this.status === 'active' && this.settings.autoExpire) {
    this.status = 'expired';
  }
  
  next();
});

// Method to record a click
TrackingLinkSchema.methods.recordClick = async function(clickData) {
  const {
    ip,
    userAgent,
    country,
    city,
    device,
    browser,
    os,
    referrer,
    sessionId
  } = clickData;
  
  // Increment click counts
  this.analytics.clicks += 1;
  
  // Check for unique click (by IP and session)
  const isUnique = !this.clickLogs.some(log => 
    log.ip === ip && log.sessionId === sessionId
  );
  
  if (isUnique) {
    this.analytics.uniqueClicks += 1;
  }
  
  // Update geographic data
  if (country && this.settings.trackGeolocation) {
    const countryIndex = this.analytics.countries.findIndex(c => c.country === country);
    
    if (countryIndex !== -1) {
      this.analytics.countries[countryIndex].clicks += 1;
    } else {
      this.analytics.countries.push({
        country,
        clicks: 1,
        conversions: 0,
        revenue: 0
      });
    }
  }
  
  // Update device data
  if (device && this.settings.trackDevices) {
    const deviceIndex = this.analytics.devices.findIndex(d => d.type === device);
    
    if (deviceIndex !== -1) {
      this.analytics.devices[deviceIndex].clicks += 1;
    } else {
      this.analytics.devices.push({
        type: device,
        clicks: 1,
        conversions: 0
      });
    }
  }
  
  // Update referrer data
  if (referrer && this.settings.trackReferrers) {
    try {
      const referrerUrl = new URL(referrer);
      const domain = referrerUrl.hostname;
      
      const referrerIndex = this.analytics.referrers.findIndex(r => r.domain === domain);
      
      if (referrerIndex !== -1) {
        this.analytics.referrers[referrerIndex].clicks += 1;
      } else {
        this.analytics.referrers.push({
          domain,
          clicks: 1,
          conversions: 0
        });
      }
    } catch (error) {
      // Invalid URL, skip referrer tracking
    }
  }
  
  // Update hourly clicks
  if (this.settings.trackClicks) {
    const hour = new Date().getHours();
    const hourIndex = this.analytics.hourlyClicks.findIndex(h => h.hour === hour);
    
    if (hourIndex !== -1) {
      this.analytics.hourlyClicks[hourIndex].clicks += 1;
    } else {
      this.analytics.hourlyClicks.push({
        hour,
        clicks: 1
      });
    }
  }
  
  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayIndex = this.analytics.dailyStats.findIndex(d => 
    d.date.getTime() === today.getTime()
  );
  
  if (dayIndex !== -1) {
    this.analytics.dailyStats[dayIndex].clicks += 1;
  } else {
    this.analytics.dailyStats.push({
      date: today,
      clicks: 1,
      conversions: 0,
      revenue: 0
    });
  }
  
  // Add click log
  this.clickLogs.push({
    ip,
    userAgent,
    country: country || 'Unknown',
    city: city || 'Unknown',
    device: device || 'other',
    browser: browser || 'Unknown',
    os: os || 'Unknown',
    referrer: referrer || 'direct',
    timestamp: new Date(),
    converted: false,
    conversionValue: 0,
    sessionId: sessionId || ''
  });
  
  // Keep only last 1000 click logs
  if (this.clickLogs.length > 1000) {
    this.clickLogs = this.clickLogs.slice(-1000);
  }
  
  this.lastClick = new Date();
  return await this.save();
};

// Method to record a conversion
TrackingLinkSchema.methods.recordConversion = async function(conversionData) {
  const {
    revenue,
    orderId,
    sessionId,
    ip
  } = conversionData;
  
  // Find the click log for this conversion
  let clickLog = null;
  
  if (sessionId) {
    clickLog = this.clickLogs.find(log => 
      log.sessionId === sessionId && !log.converted
    );
  }
  
  if (!clickLog && ip) {
    clickLog = this.clickLogs.find(log => 
      log.ip === ip && !log.converted
    );
  }
  
  // If no specific click log found, use the most recent one
  if (!clickLog && this.clickLogs.length > 0) {
    clickLog = this.clickLogs[this.clickLogs.length - 1];
  }
  
  // Update conversion counts
  this.analytics.conversions += 1;
  this.analytics.revenue += revenue || 0;
  
  if (clickLog) {
    clickLog.converted = true;
    clickLog.conversionValue = revenue || 0;
    
    // Update geographic conversion data
    if (clickLog.country && clickLog.country !== 'Unknown') {
      const countryIndex = this.analytics.countries.findIndex(c => c.country === clickLog.country);
      
      if (countryIndex !== -1) {
        this.analytics.countries[countryIndex].conversions += 1;
        this.analytics.countries[countryIndex].revenue += revenue || 0;
      }
    }
    
    // Update device conversion data
    if (clickLog.device) {
      const deviceIndex = this.analytics.devices.findIndex(d => d.type === clickLog.device);
      
      if (deviceIndex !== -1) {
        this.analytics.devices[deviceIndex].conversions += 1;
      }
    }
    
    // Update referrer conversion data
    if (clickLog.referrer && clickLog.referrer !== 'direct') {
      try {
        const referrerUrl = new URL(clickLog.referrer);
        const domain = referrerUrl.hostname;
        
        const referrerIndex = this.analytics.referrers.findIndex(r => r.domain === domain);
        
        if (referrerIndex !== -1) {
          this.analytics.referrers[referrerIndex].conversions += 1;
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  }
  
  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayIndex = this.analytics.dailyStats.findIndex(d => 
    d.date.getTime() === today.getTime()
  );
  
  if (dayIndex !== -1) {
    this.analytics.dailyStats[dayIndex].conversions += 1;
    this.analytics.dailyStats[dayIndex].revenue += revenue || 0;
  } else {
    this.analytics.dailyStats.push({
      date: today,
      clicks: 0,
      conversions: 1,
      revenue: revenue || 0
    });
  }
  
  // Update conversion rate
  if (this.analytics.clicks > 0) {
    this.analytics.conversionRate = (this.analytics.conversions / this.analytics.clicks) * 100;
  }
  
  this.lastConversion = new Date();
  
  // Update revenue tracking in Revenue model
  if (revenue > 0) {
    const Revenue = mongoose.model('Revenue');
    
    await Revenue.findOneAndUpdate(
      { linkId: this.linkId, order: orderId },
      {
        $set: {
          linkId: this.linkId,
          trackingLink: this.link,
          revenue: revenue
        }
      },
      { upsert: true, new: true }
    );
  }
  
  return await this.save();
};

// Method to extend expiration
TrackingLinkSchema.methods.extendExpiration = async function(hours) {
  const extensionMs = hours * 60 * 60 * 1000;
  this.expiresAt = new Date(this.expiresAt.getTime() + extensionMs);
  
  if (this.status === 'expired') {
    this.status = 'active';
  }
  
  return await this.save();
};

// Method to pause tracking
TrackingLinkSchema.methods.pause = async function() {
  this.status = 'paused';
  return await this.save();
};

// Method to resume tracking
TrackingLinkSchema.methods.resume = async function() {
  if (this.isExpired) {
    throw new Error('Cannot resume expired link');
  }
  
  this.status = 'active';
  return await this.save();
};

// Method to get analytics summary
TrackingLinkSchema.methods.getAnalyticsSummary = function() {
  return {
    linkId: this.linkId,
    link: this.link,
    shortLink: this.shortLink,
    type: this.type,
    status: this.status,
    generatedBy: this.generatedBy,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    isExpired: this.isExpired,
    daysRemaining: this.daysRemaining,
    
    analytics: {
      clicks: this.analytics.clicks,
      uniqueClicks: this.analytics.uniqueClicks,
      conversions: this.analytics.conversions,
      revenue: this.analytics.revenue,
      conversionRate: this.analytics.conversionRate,
      averageOrderValue: this.averageOrderValue,
      revenuePerClick: this.revenuePerClick,
      
      topCountries: this.analytics.countries
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5),
      
      topDevices: this.analytics.devices
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 3),
      
      topReferrers: this.analytics.referrers
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5),
      
      dailyPerformance: this.analytics.dailyStats
        .sort((a, b) => b.date - a.date)
        .slice(0, 7),
      
      hourlyPerformance: this.analytics.hourlyClicks
        .sort((a, b) => a.hour - b.hour)
    },
    
    lastClick: this.lastClick,
    lastConversion: this.lastConversion,
    updatedAt: this.updatedAt
  };
};

// Static method to generate super admin link
TrackingLinkSchema.statics.generateSuperAdminLink = async function(userEmail, options = {}) {
  if (userEmail !== process.env.SUPER_ADMIN_EMAIL) {
    throw new Error('Only super admin can generate tracking links');
  }
  
  const {
    targetUrl = null,
    productId = null,
    campaignName = 'Super Admin Campaign',
    expiresInHours = 24,
    customParams = {}
  } = options;
  
  // Get user ID
  const User = mongoose.model('User');
  const user = await User.findOne({ email: userEmail });
  
  const trackingLink = await this.create({
    generatedBy: userEmail,
    userId: user?._id,
    type: 'super-admin',
    campaign: {
      name: campaignName,
      source: 'super-admin',
      medium: 'direct',
      content: 'super-admin-link'
    },
    target: {
      url: targetUrl,
      product: productId,
      action: 'purchase'
    },
    parameters: customParams,
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    metadata: {
      description: 'Super admin tracking link',
      tags: ['super-admin', 'tracking']
    }
  });
  
  return trackingLink;
};

// Static method to get expired links
TrackingLinkSchema.statics.getExpiredLinks = async function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    expiresAt: { $lt: new Date() },
    status: 'active',
    'settings.autoExpire': true,
    updatedAt: { $lt: cutoffDate }
  });
};

// Static method to cleanup old data
TrackingLinkSchema.statics.cleanupOldData = async function(daysToKeep = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    status: 'expired',
    updatedAt: { $lt: cutoffDate }
  });
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate,
    cleanedAt: new Date()
  };
};

// Static method to get link performance report
TrackingLinkSchema.statics.getPerformanceReport = async function(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    type = null,
    generatedBy = null,
    minClicks = 0,
    minRevenue = 0
  } = options;
  
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (type) {
    matchQuery.type = type;
  }
  
  if (generatedBy) {
    matchQuery.generatedBy = generatedBy;
  }
  
  const links = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $project: {
        linkId: 1,
        link: 1,
        type: 1,
        generatedBy: 1,
        createdAt: 1,
        expiresAt: 1,
        status: 1,
        'analytics.clicks': 1,
        'analytics.conversions': 1,
        'analytics.revenue': 1,
        'analytics.conversionRate': 1,
        clickThroughRate: {
          $cond: [
            { $eq: ['$analytics.clicks', 0] },
            0,
            { $multiply: [
              { $divide: ['$analytics.conversions', '$analytics.clicks'] },
              100
            ]}
          ]
        },
        averageOrderValue: {
          $cond: [
            { $eq: ['$analytics.conversions', 0] },
            0,
            { $divide: ['$analytics.revenue', '$analytics.conversions'] }
          ]
        },
        revenuePerClick: {
          $cond: [
            { $eq: ['$analytics.clicks', 0] },
            0,
            { $divide: ['$analytics.revenue', '$analytics.clicks'] }
          ]
        }
      }
    },
    {
      $match: {
        'analytics.clicks': { $gte: minClicks },
        'analytics.revenue': { $gte: minRevenue }
      }
    },
    {
      $sort: { 'analytics.revenue': -1 }
    }
  ]);
  
  // Calculate totals
  const totals = links.reduce((acc, link) => ({
    totalClicks: acc.totalClicks + (link.analytics?.clicks || 0),
    totalConversions: acc.totalConversions + (link.analytics?.conversions || 0),
    totalRevenue: acc.totalRevenue + (link.analytics?.revenue || 0),
    totalLinks: acc.totalLinks + 1
  }), {
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalLinks: 0
  });
  
  // Calculate averages
  totals.averageConversionRate = totals.totalClicks > 0 
    ? (totals.totalConversions / totals.totalClicks) * 100 
    : 0;
    
  totals.averageRevenuePerClick = totals.totalClicks > 0 
    ? totals.totalRevenue / totals.totalClicks 
    : 0;
    
  totals.averageOrderValue = totals.totalConversions > 0 
    ? totals.totalRevenue / totals.totalConversions 
    : 0;
  
  return {
    period: { startDate, endDate },
    totals,
    links,
    generatedAt: new Date()
  };
};

module.exports = mongoose.model('TrackingLink', TrackingLinkSchema);