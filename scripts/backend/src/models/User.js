// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  
  avatar: {
    type: String,
    default: '/images/avatar-default.png'
  },
  
  // User Roles and Status
  role: {
    type: String,
    enum: ['user', 'seller', 'affiliate', 'admin', 'super-admin'],
    default: 'user'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Store Information (for sellers)
  store: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Store name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Store description cannot exceed 500 characters']
    },
    logo: {
      type: String,
      default: null
    },
    banner: {
      type: String,
      default: null
    },
    category: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    productsCount: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Affiliate Information
  affiliate: {
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: String,
      default: null
    },
    totalReferrals: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    availableBalance: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: null
    }
  },
  
  // Subscription and Payments
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'expired', 'pending'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days from now
    },
    autoRenew: {
      type: Boolean,
      default: true
    },
    paymentMethod: {
      type: String,
      enum: ['paypal', 'stripe', 'bank', 'mobile', null],
      default: null
    }
  },
  
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    lastTopUp: {
      type: Date,
      default: null
    },
    transactions: [{
      type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'payment', 'refund', 'commission']
      },
      amount: Number,
      description: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled']
      },
      reference: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Address Information
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'billing', 'shipping'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    isDefault: {
      type: Boolean,
      default: false
    },
    phone: String
  }],
  
  // Preferences
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    marketingEmails: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  loginHistory: [{
    ip: String,
    userAgent: String,
    location: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean
  }],
  
  // Reset Password Tokens
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Timestamps
  lastLogin: {
    type: Date,
    default: null
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for profile URL
UserSchema.virtual('profileUrl').get(function() {
  return `/user/${this._id}`;
});

// Virtual for store URL (if seller)
UserSchema.virtual('storeUrl').get(function() {
  if (this.role === 'seller' && this.store && this.store.name) {
    const slug = this.store.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `/store/${slug}`;
  }
  return null;
});

// Virtual for formatted balance
UserSchema.virtual('formattedBalance').get(function() {
  return `${this.wallet.currency} ${this.wallet.balance.toFixed(2)}`;
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'affiliate.code': 1 }, { sparse: true });
UserSchema.index({ 'store.name': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'subscription.status': 1 });
UserSchema.index({ 'subscription.tier': 1 });
UserSchema.index({ 'wallet.balance': -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure only one default address exists
  if (this.addresses && this.addresses.length > 0) {
    const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
    if (defaultAddresses.length > 1) {
      // Keep only the first one as default
      this.addresses.forEach((addr, index) => {
        addr.isDefault = index === this.addresses.findIndex(a => a.isDefault);
      });
    }
  }
  
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
UserSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      isVerified: this.isVerified
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Method to generate refresh token
UserSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// Method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Method to get safe user object (without sensitive data)
UserSchema.methods.getSafeUser = function() {
  const userObject = this.toObject();
  
  // Remove sensitive data
  delete userObject.password;
  delete userObject.twoFactorSecret;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpire;
  delete userObject.loginHistory;
  
  return userObject;
};

// Method to check if user is super admin
UserSchema.methods.isSuperAdmin = function() {
  return this.email === process.env.SUPER_ADMIN_EMAIL || this.role === 'super-admin';
};

// Method to check if user can boost products
UserSchema.methods.canBoostProducts = function() {
  if (this.isSuperAdmin()) return true;
  if (this.role === 'admin') return true;
  if (this.role === 'seller' && this.wallet.balance > 0) return true;
  return false;
};

// Method to add address
UserSchema.methods.addAddress = async function(addressData) {
  const newAddress = {
    ...addressData,
    isDefault: this.addresses.length === 0 // First address becomes default
  };
  
  this.addresses.push(newAddress);
  return await this.save();
};

// Method to set default address
UserSchema.methods.setDefaultAddress = async function(addressId) {
  this.addresses.forEach(addr => {
    addr.isDefault = addr._id.toString() === addressId.toString();
  });
  
  return await this.save();
};

// Method to record login attempt
UserSchema.methods.recordLogin = async function(ip, userAgent, location, success = true) {
  this.loginHistory.push({
    ip,
    userAgent,
    location,
    success,
    timestamp: new Date()
  });
  
  // Keep only last 20 login attempts
  if (this.loginHistory.length > 20) {
    this.loginHistory = this.loginHistory.slice(-20);
  }
  
  if (success) {
    this.lastLogin = new Date();
  }
  
  this.lastActivity = new Date();
  return await this.save();
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

// Static method to find by affiliate code
UserSchema.statics.findByAffiliateCode = function(code) {
  return this.findOne({ 'affiliate.code': code.toUpperCase().trim() });
};

// Static method to get top sellers
UserSchema.statics.getTopSellers = async function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        role: 'seller',
        status: 'active',
        'store.totalSales': { $gt: 0 }
      }
    },
    {
      $sort: { 'store.totalSales': -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        name: 1,
        email: 1,
        avatar: 1,
        'store.name': 1,
        'store.logo': 1,
        'store.rating': 1,
        'store.totalSales': 1,
        'store.productsCount': 1,
        'store.joinedAt': 1
      }
    }
  ]);
};

// Static method to get user statistics
UserSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        verified: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        totalBalance: { $sum: '$wallet.balance' },
        avgRating: { $avg: '$store.rating' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  const totalStats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalActive: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalVerified: {
          $sum: { $cond: ['$isVerified', 1, 0] }
        },
        totalBalance: { $sum: '$wallet.balance' },
        todayRegistrations: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date().setHours(0, 0, 0, 0)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return {
    byRole: stats,
    totals: totalStats[0] || {},
    generatedAt: new Date()
  };
};

module.exports = mongoose.model('User', UserSchema);