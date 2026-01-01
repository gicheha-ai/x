// backend/src/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Customer Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Seller Information (for multi-vendor orders)
  sellers: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    storeName: String
  }],
  
  // Order Items
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    sku: String,
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    variant: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    image: String,
    weight: Number,
    weightUnit: String,
    isDigital: {
      type: Boolean,
      default: false
    },
    downloadLink: String,
    downloadExpires: Date
  }],
  
  // Pricing Summary
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalAmount: {
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
      enum: ['paypal', 'stripe', 'bank', 'mobile', 'cash_on_delivery', 'wallet'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentGateway: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    receiptUrl: String
  },
  
  // Shipping Information
  shipping: {
    method: {
      type: String,
      required: true
    },
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    deliveredAt: Date,
    address: {
      type: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
      },
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },
  
  // Billing Information
  billing: {
    sameAsShipping: {
      type: Boolean,
      default: true
    },
    address: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      taxId: String
    }
  },
  
  // Order Status
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'failed',
      'on_hold'
    ],
    default: 'pending'
  },
  
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Affiliate Tracking
  affiliateRef: {
    type: String,
    default: null
  },
  
  affiliateCommission: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Customer Notes
  customerNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Customer note cannot exceed 500 characters']
  },
  
  adminNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin note cannot exceed 500 characters']
  },
  
  // Digital Products
  digitalProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    downloadLink: String,
    downloadKey: String,
    downloadsRemaining: Number,
    downloadExpires: Date,
    accessedAt: [Date]
  }],
  
  // Returns and Refunds
  returnRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', null],
      default: null
    },
    requestedAt: Date,
    resolvedAt: Date,
    refundAmount: Number,
    returnShipping: {
      method: String,
      trackingNumber: String,
      cost: Number
    }
  },
  
  // Analytics
  source: {
    type: String,
    enum: ['website', 'mobile', 'api', 'affiliate', 'admin', null],
    default: 'website'
  },
  
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'other', null],
      default: null
    },
    os: String,
    browser: String
  },
  
  ipAddress: String,
  userAgent: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
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

// Virtual for formatted total
OrderSchema.virtual('formattedTotal').get(function() {
  return `${this.currency} ${this.totalAmount.toFixed(2)}`;
});

// Virtual for item count
OrderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order age
OrderSchema.virtual('ageInDays').get(function() {
  const age = Date.now() - this.createdAt.getTime();
  return Math.floor(age / (1000 * 60 * 60 * 24));
});

// Virtual for estimated delivery status
OrderSchema.virtual('deliveryStatus').get(function() {
  if (this.status === 'delivered') return 'delivered';
  if (this.status === 'shipped' && this.shipping.estimatedDelivery) {
    const now = new Date();
    if (now > this.shipping.estimatedDelivery) return 'delayed';
    return 'in_transit';
  }
  if (this.status === 'processing') return 'processing';
  return 'pending';
});

// Virtual for canCancel
OrderSchema.virtual('canCancel').get(function() {
  const cancellableStatuses = ['pending', 'confirmed', 'processing'];
  return cancellableStatuses.includes(this.status);
});

// Virtual for canReturn
OrderSchema.virtual('canReturn').get(function() {
  if (this.status !== 'delivered') return false;
  if (this.returnRequest && this.returnRequest.requested) return false;
  
  const deliveredDate = this.shipping.deliveredAt || this.updatedAt;
  const returnPeriod = 30; // 30-day return policy
  const daysSinceDelivery = Math.floor((Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceDelivery <= returnPeriod;
});

// Indexes
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'sellers.seller': 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'shipping.trackingNumber': 1 }, { sparse: true });
OrderSchema.index({ 'payment.transactionId': 1 }, { sparse: true });
OrderSchema.index({ totalAmount: -1 });
OrderSchema.index({ affiliateRef: 1 });

// Pre-save middleware to generate order number
OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Calculate totals if items changed
  if (this.isModified('items')) {
    this.calculateTotals();
  }
  
  // Record status change
  if (this.isModified('status')) {
    this.recordStatusChange();
  }
  
  next();
});

// Method to calculate order totals
OrderSchema.methods.calculateTotals = function() {
  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Calculate platform fee (8% transaction fee)
  this.platformFee = this.subtotal * 0.08;
  
  // Calculate total
  this.totalAmount = this.subtotal + this.shippingFee + this.taxAmount - this.discountAmount;
  
  // Ensure non-negative total
  if (this.totalAmount < 0) {
    this.totalAmount = 0;
  }
};

// Method to record status change
OrderSchema.methods.recordStatusChange = function(changedBy = null, note = '') {
  this.statusHistory.push({
    status: this.status,
    changedBy: changedBy || this.updatedBy,
    note,
    timestamp: new Date()
  });
  
  // Keep only last 20 status changes
  if (this.statusHistory.length > 20) {
    this.statusHistory = this.statusHistory.slice(-20);
  }
};

// Method to add item to order
OrderSchema.methods.addItem = function(itemData) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === itemData.product.toString() &&
           JSON.stringify(item.variant) === JSON.stringify(itemData.variant)
  );
  
  if (existingItemIndex !== -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += itemData.quantity;
    this.items[existingItemIndex].total = this.items[existingItemIndex].price * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      ...itemData,
      total: itemData.price * itemData.quantity
    });
  }
  
  // Update sellers array
  if (!this.sellers.some(seller => seller.seller.toString() === itemData.seller.toString())) {
    this.sellers.push({
      seller: itemData.seller,
      storeName: itemData.storeName || ''
    });
  }
  
  this.calculateTotals();
};

// Method to remove item from order
OrderSchema.methods.removeItem = function(itemIndex) {
  if (itemIndex >= 0 && itemIndex < this.items.length) {
    const removedItem = this.items.splice(itemIndex, 1)[0];
    
    // Remove seller if no more items from that seller
    const sellerItemCount = this.items.filter(item => 
      item.seller.toString() === removedItem.seller.toString()
    ).length;
    
    if (sellerItemCount === 0) {
      this.sellers = this.sellers.filter(seller => 
        seller.seller.toString() !== removedItem.seller.toString()
      );
    }
    
    this.calculateTotals();
    return true;
  }
  return false;
};

// Method to update item quantity
OrderSchema.methods.updateItemQuantity = function(itemIndex, quantity) {
  if (itemIndex >= 0 && itemIndex < this.items.length && quantity > 0) {
    this.items[itemIndex].quantity = quantity;
    this.items[itemIndex].total = this.items[itemIndex].price * quantity;
    this.calculateTotals();
    return true;
  }
  return false;
};

// Method to process payment
OrderSchema.methods.processPayment = async function(paymentData) {
  this.payment = {
    ...this.payment,
    ...paymentData,
    paidAt: new Date()
  };
  
  // Update payment status
  if (paymentData.transactionId) {
    this.payment.status = 'completed';
    
    // Update order status
    if (this.status === 'pending') {
      this.status = 'confirmed';
      this.recordStatusChange(null, 'Payment completed');
    }
  }
  
  return await this.save();
};

// Method to update shipping
OrderSchema.methods.updateShipping = async function(shippingData) {
  this.shipping = {
    ...this.shipping,
    ...shippingData
  };
  
  // Update order status if shipped
  if (shippingData.trackingNumber && this.status === 'confirmed') {
    this.status = 'shipped';
    this.recordStatusChange(null, 'Order shipped');
  }
  
  return await this.save();
};

// Method to mark as delivered
OrderSchema.methods.markAsDelivered = async function() {
  this.status = 'delivered';
  this.shipping.deliveredAt = new Date();
  this.recordStatusChange(null, 'Order delivered');
  
  // Trigger affiliate commission processing
  if (this.affiliateRef && this.payment.status === 'completed') {
    const affiliateController = require('../controllers/affiliateController');
    await affiliateController.processAffiliateCommission(this._id);
  }
  
  return await this.save();
};

// Method to cancel order
OrderSchema.methods.cancelOrder = async function(reason = '', cancelledBy = null) {
  if (!this.canCancel) {
    throw new Error('Order cannot be cancelled in its current status');
  }
  
  this.status = 'cancelled';
  this.recordStatusChange(cancelledBy, `Order cancelled: ${reason}`);
  
  // Restore product stock
  const Product = mongoose.model('Product');
  
  for (const item of this.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity }
    });
  }
  
  // Process refund if payment was made
  if (this.payment.status === 'completed') {
    this.payment.status = 'refunded';
    this.payment.refundedAt = new Date();
    this.payment.refundAmount = this.totalAmount;
  }
  
  return await this.save();
};

// Method to request return
OrderSchema.methods.requestReturn = async function(reason, requestedBy) {
  if (!this.canReturn) {
    throw new Error('Return cannot be requested for this order');
  }
  
  this.returnRequest = {
    requested: true,
    reason,
    status: 'pending',
    requestedAt: new Date(),
    resolvedAt: null,
    refundAmount: null
  };
  
  return await this.save();
};

// Static method to get order statistics
OrderSchema.statics.getOrderStats = async function(timePeriod = 'month') {
  const now = new Date();
  let startDate;
  
  switch (timePeriod) {
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
  
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        totalItems: { $sum: { $sum: '$items.quantity' } },
        avgOrderValue: { $avg: '$totalAmount' },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'processing']] }, 1, 0] }
        }
      }
    }
  ]);
  
  // Get daily revenue for chart
  const dailyRevenue = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
  
  // Get top products
  const topProducts = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 }
  ]);
  
  // Get payment method distribution
  const paymentMethods = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: '$payment.method',
        count: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { revenue: -1 } }
  ]);
  
  return {
    period: timePeriod,
    startDate,
    endDate: new Date(),
    stats: stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalItems: 0,
      avgOrderValue: 0,
      completedOrders: 0,
      pendingOrders: 0
    },
    dailyRevenue,
    topProducts,
    paymentMethods,
    generatedAt: new Date()
  };
};

// Static method to get seller orders
OrderSchema.statics.getSellerOrders = async function(sellerId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    startDate = null,
    endDate = null
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query
  const query = {
    'items.seller': sellerId
  };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const [orders, total] = await Promise.all([
    this.find(query)
      .select('orderNumber user items status totalAmount createdAt payment.status shipping.method')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  // Filter items for this seller only
  const filteredOrders = orders.map(order => ({
    ...order,
    items: order.items.filter(item => item.seller.toString() === sellerId.toString()),
    sellerTotal: order.items
      .filter(item => item.seller.toString() === sellerId.toString())
      .reduce((sum, item) => sum + item.total, 0)
  }));
  
  // Calculate seller statistics
  const sellerStats = await this.aggregate([
    {
      $match: {
        'items.seller': sellerId,
        status: { $ne: 'cancelled' }
      }
    },
    { $unwind: '$items' },
    {
      $match: {
        'items.seller': sellerId
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalItems: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' },
        avgOrderValue: { $avg: '$items.total' }
      }
    }
  ]);
  
  return {
    orders: filteredOrders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    sellerStats: sellerStats[0] || {
      totalOrders: 0,
      totalItems: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    }
  };
};

module.exports = mongoose.model('Order', OrderSchema);