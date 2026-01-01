// backend/src/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Payment Identification
  paymentId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Reference to order or transaction
  referenceId: {
    type: String,
    required: true,
    index: true
  },
  
  referenceType: {
    type: String,
    enum: ['order', 'boost', 'subscription', 'deposit', 'withdrawal', 'refund', 'other'],
    required: true
  },
  
  // Payer Information
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  payerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  payerName: {
    type: String,
    trim: true
  },
  
  payerPhone: {
    type: String,
    trim: true
  },
  
  // Recipient Information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  recipientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  recipientName: {
    type: String,
    trim: true
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  
  exchangeRate: {
    type: Number,
    default: 1
  },
  
  convertedAmount: {
    type: Number,
    default: 0
  },
  
  // Fee Information
  fees: {
    processing: {
      type: Number,
      default: 0,
      min: 0
    },
    platform: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Method
  method: {
    type: String,
    required: true,
    enum: ['paypal', 'stripe', 'bank', 'mobile', 'wallet', 'cash_on_delivery', 'crypto', 'other']
  },
  
  methodDetails: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Gateway Information
  gateway: {
    name: String,
    transactionId: String,
    reference: String,
    authCode: String,
    gatewayFees: Number,
    response: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Payment Status
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded',
      'disputed',
      'chargeback'
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
  
  // Timing Information
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  failedAt: {
    type: Date,
    default: null
  },
  
  // Refund Information
  refund: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    processedAt: Date,
    amount: Number,
    reason: String,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gatewayRefundId: String
  },
  
  // Dispute Information
  dispute: {
    opened: {
      type: Boolean,
      default: false
    },
    openedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['open', 'won', 'lost', 'closed', null],
      default: null
    },
    resolvedAt: Date,
    resolution: String
  },
  
  // Security & Verification
  security: {
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    riskScore: Number,
    verified: {
      type: Boolean,
      default: false
    },
    verificationMethod: String,
    fraudCheck: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  metadata: {
    description: String,
    notes: String,
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    affiliateRef: String,
    trackingLink: String,
    campaign: String
  },
  
  // Webhook & Notification
  webhook: {
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date,
    attempts: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    response: String
  },
  
  notifications: {
    payer: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      method: String
    },
    recipient: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      method: String
    },
    admin: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      method: String
    }
  },
  
  // Accounting
  accounting: {
    reconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    journalEntry: String,
    taxDocument: String
  },
  
  // Timestamps
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

// Virtual for formatted amount
PaymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Virtual for formatted net amount
PaymentSchema.virtual('formattedNetAmount').get(function() {
  return `${this.currency} ${this.netAmount.toFixed(2)}`;
});

// Virtual for formatted fees
PaymentSchema.virtual('formattedFees').get(function() {
  return `${this.currency} ${this.fees.total.toFixed(2)}`;
});

// Virtual for payment age in hours
PaymentSchema.virtual('ageInHours').get(function() {
  const age = Date.now() - this.createdAt.getTime();
  return Math.floor(age / (1000 * 60 * 60));
});

// Virtual for canRefund
PaymentSchema.virtual('canRefund').get(function() {
  if (this.status !== 'completed') return false;
  if (this.refund.requested) return false;
  if (this.dispute.opened) return false;
  
  // Check if refund is within allowed period (30 days)
  const maxRefundDays = 30;
  const paymentAge = this.ageInHours / 24;
  return paymentAge <= maxRefundDays;
});

// Virtual for isSuccessful
PaymentSchema.virtual('isSuccessful').get(function() {
  return ['completed', 'refunded', 'partially_refunded'].includes(this.status);
});

// Virtual for payment method icon
PaymentSchema.virtual('methodIcon').get(function() {
  const icons = {
    'paypal': 'paypal',
    'stripe': 'credit-card',
    'bank': 'university',
    'mobile': 'mobile-alt',
    'wallet': 'wallet',
    'cash_on_delivery': 'money-bill-wave',
    'crypto': 'bitcoin',
    'other': 'money-check-alt'
  };
  return icons[this.method] || 'money-check-alt';
});

// Virtual for status color
PaymentSchema.virtual('statusColor').get(function() {
  const colors = {
    'completed': 'success',
    'pending': 'warning',
    'processing': 'info',
    'failed': 'danger',
    'cancelled': 'secondary',
    'refunded': 'info',
    'partially_refunded': 'info',
    'disputed': 'danger',
    'chargeback': 'danger'
  };
  return colors[this.status] || 'secondary';
});

// Indexes
PaymentSchema.index({ paymentId: 1 }, { unique: true });
PaymentSchema.index({ referenceId: 1 });
PaymentSchema.index({ payer: 1 });
PaymentSchema.index({ recipient: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ method: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ amount: -1 });
PaymentSchema.index({ 'gateway.transactionId': 1 }, { sparse: true });
PaymentSchema.index({ 'metadata.affiliateRef': 1 });
PaymentSchema.index({ 'metadata.trackingLink': 1 });
PaymentSchema.index({ payerEmail: 1 });
PaymentSchema.index({ 'security.ipAddress': 1 });

// Pre-save middleware to generate payment ID
PaymentSchema.pre('save', function(next) {
  if (this.isNew && !this.paymentId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const methodPrefix = this.method.substring(0, 3).toUpperCase();
    this.paymentId = `PAY-${methodPrefix}-${timestamp}-${random}`;
  }
  
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  // Calculate fees if not provided
  if (this.isNew && this.fees.total === 0) {
    this.calculateFees();
  }
  
  // Calculate net amount
  this.netAmount = this.amount - this.fees.total;
  if (this.netAmount < 0) this.netAmount = 0;
  
  // Record status change
  if (this.isModified('status')) {
    this.recordStatusChange();
  }
  
  // Set completion timestamp
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Set failure timestamp
  if (this.isModified('status') && this.status === 'failed' && !this.failedAt) {
    this.failedAt = new Date();
  }
  
  // Set processed timestamp for processing status
  if (this.isModified('status') && this.status === 'processing' && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// Method to calculate fees
PaymentSchema.methods.calculateFees = function() {
  let processingFee = 0;
  let platformFee = 0;
  
  // Calculate processing fee based on payment method
  switch (this.method) {
    case 'paypal':
      processingFee = this.amount * 0.029 + 0.30; // 2.9% + $0.30
      break;
    case 'stripe':
      processingFee = this.amount * 0.029 + 0.30; // 2.9% + $0.30
      break;
    case 'bank':
      processingFee = this.amount * 0.01; // 1%
      break;
    case 'mobile':
      processingFee = this.amount * 0.02; // 2%
      break;
    case 'wallet':
      processingFee = 0; // No processing fee for internal wallet
      break;
    case 'crypto':
      processingFee = this.amount * 0.005; // 0.5%
      break;
    default:
      processingFee = this.amount * 0.03; // 3% default
  }
  
  // Calculate platform fee (8% for sales, 0 for other types)
  if (this.referenceType === 'order') {
    platformFee = this.amount * 0.08; // 8% platform commission
  }
  
  // Calculate tax (if applicable)
  const tax = this.fees.tax || 0;
  
  this.fees = {
    processing: parseFloat(processingFee.toFixed(2)),
    platform: parseFloat(platformFee.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat((processingFee + platformFee + tax).toFixed(2))
  };
};

// Method to record status change
PaymentSchema.methods.recordStatusChange = function(changedBy = null, note = '') {
  this.statusHistory.push({
    status: this.status,
    changedBy,
    note,
    timestamp: new Date()
  });
  
  // Keep only last 20 status changes
  if (this.statusHistory.length > 20) {
    this.statusHistory = this.statusHistory.slice(-20);
  }
};

// Method to process payment
PaymentSchema.methods.process = async function(gatewayResponse = {}) {
  if (this.status !== 'pending') {
    throw new Error(`Cannot process payment in ${this.status} status`);
  }
  
  this.status = 'processing';
  this.processedAt = new Date();
  
  // Update gateway information
  if (gatewayResponse.transactionId) {
    this.gateway.transactionId = gatewayResponse.transactionId;
  }
  
  if (gatewayResponse.reference) {
    this.gateway.reference = gatewayResponse.reference;
  }
  
  if (gatewayResponse.authCode) {
    this.gateway.authCode = gatewayResponse.authCode;
  }
  
  this.gateway.response = gatewayResponse;
  
  return await this.save();
};

// Method to complete payment
PaymentSchema.methods.complete = async function() {
  if (!['pending', 'processing'].includes(this.status)) {
    throw new Error(`Cannot complete payment in ${this.status} status`);
  }
  
  this.status = 'completed';
  this.completedAt = new Date();
  
  // Record revenue if this is an order payment
  if (this.referenceType === 'order') {
    const Revenue = mongoose.model('Revenue');
    
    // Record platform commission
    await Revenue.recordCommissionRevenue({
      order: this.referenceId,
      amount: this.fees.platform,
      seller: this.recipient,
      paymentMethod: this.method,
      transactionId: this.paymentId
    });
    
    // Record boost revenue if applicable
    const Order = mongoose.model('Order');
    const order = await Order.findById(this.referenceId).populate('items.product');
    
    if (order && order.items) {
      for (const item of order.items) {
        if (item.product && item.product.isBoosted) {
          await Revenue.recordBoostRevenue({
            product: item.product._id,
            seller: item.product.seller,
            amount: 10, // Example boost fee
            duration: 'daily',
            paymentMethod: this.method,
            transactionId: this.paymentId,
            createdBy: this.payer
          });
        }
      }
    }
  }
  
  // Record boost payment
  if (this.referenceType === 'boost') {
    const Revenue = mongoose.model('Revenue');
    
    await Revenue.recordBoostRevenue({
      product: this.metadata.customFields?.productId,
      seller: this.payer,
      amount: this.amount,
      duration: this.metadata.customFields?.duration || 'daily',
      paymentMethod: this.method,
      transactionId: this.paymentId,
      createdBy: this.payer
    });
  }
  
  // Record subscription payment
  if (this.referenceType === 'subscription') {
    const Revenue = mongoose.model('Revenue');
    
    await Revenue.recordSubscriptionRevenue({
      user: this.payer,
      amount: this.amount,
      tier: this.metadata.customFields?.tier || 'basic',
      paymentMethod: this.method,
      transactionId: this.paymentId,
      period: this.metadata.customFields?.period || 'monthly'
    });
  }
  
  return await this.save();
};

// Method to fail payment
PaymentSchema.methods.fail = async function(reason = '') {
  if (this.status === 'completed') {
    throw new Error('Cannot fail completed payment');
  }
  
  this.status = 'failed';
  this.failedAt = new Date();
  this.metadata.notes = reason;
  
  return await this.save();
};

// Method to refund payment
PaymentSchema.methods.refundPayment = async function(amount = null, reason = '', refundedBy = null) {
  if (!this.canRefund) {
    throw new Error('Payment cannot be refunded');
  }
  
  const refundAmount = amount || this.amount;
  
  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed original payment amount');
  }
  
  this.refund = {
    requested: true,
    requestedAt: new Date(),
    amount: refundAmount,
    reason,
    refundedBy
  };
  
  if (refundAmount === this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  // Record refund in Revenue model
  const Revenue = mongoose.model('Revenue');
  
  await Revenue.create({
    type: 'refund',
    amount: -refundAmount,
    currency: this.currency,
    source: {
      type: 'payment',
      id: this._id,
      name: 'Payment Refund',
      description: `Refund for ${this.referenceType}`
    },
    paymentMethod: this.method,
    description: `Refund: ${reason}`,
    status: 'completed',
    metadata: {
      originalPayment: this.paymentId,
      refundReason: reason
    }
  });
  
  return await this.save();
};

// Method to open dispute
PaymentSchema.methods.openDispute = async function(reason = '') {
  if (this.dispute.opened) {
    throw new Error('Dispute already opened');
  }
  
  if (!['completed', 'refunded', 'partially_refunded'].includes(this.status)) {
    throw new Error('Dispute can only be opened for completed payments');
  }
  
  this.dispute = {
    opened: true,
    openedAt: new Date(),
    reason,
    status: 'open'
  };
  
  return await this.save();
};

// Method to resolve dispute
PaymentSchema.methods.resolveDispute = async function(resolution, status, resolvedBy = null) {
  if (!this.dispute.opened) {
    throw new Error('No dispute to resolve');
  }
  
  if (this.dispute.status !== 'open') {
    throw new Error('Dispute already resolved');
  }
  
  this.dispute.status = status;
  this.dispute.resolution = resolution;
  this.dispute.resolvedAt = new Date();
  
  // If dispute is lost, mark payment as chargeback
  if (status === 'lost') {
    this.status = 'chargeback';
  }
  
  return await this.save();
};

// Method to send webhook
PaymentSchema.methods.sendWebhook = async function(webhookUrl = null) {
  if (this.webhook.sent) {
    throw new Error('Webhook already sent');
  }
  
  // In production, this would make an HTTP request to the webhook URL
  // For now, we'll simulate it
  
  const webhookData = {
    paymentId: this.paymentId,
    referenceId: this.referenceId,
    referenceType: this.referenceType,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    method: this.method,
    payerEmail: this.payerEmail,
    recipientEmail: this.recipientEmail,
    timestamp: new Date().toISOString()
  };
  
  // Simulate webhook sending
  this.webhook = {
    sent: true,
    sentAt: new Date(),
    attempts: 1,
    lastAttempt: new Date(),
    response: 'Webhook sent successfully'
  };
  
  return await this.save();
};

// Method to get payment summary
PaymentSchema.methods.getSummary = function() {
  return {
    paymentId: this.paymentId,
    referenceId: this.referenceId,
    referenceType: this.referenceType,
    payer: {
      id: this.payer,
      email: this.payerEmail,
      name: this.payerName
    },
    recipient: {
      id: this.recipient,
      email: this.recipientEmail,
      name: this.recipientName
    },
    amount: {
      gross: this.amount,
      currency: this.currency,
      fees: this.fees.total,
      net: this.netAmount,
      formattedGross: this.formattedAmount,
      formattedNet: this.formattedNetAmount
    },
    method: this.method,
    status: this.status,
    dates: {
      created: this.createdAt,
      processed: this.processedAt,
      completed: this.completedAt
    },
    canRefund: this.canRefund,
    hasDispute: this.dispute.opened,
    metadata: this.metadata
  };
};

// Static method to create payment for order
PaymentSchema.statics.createForOrder = async function(orderData) {
  const {
    orderId,
    userId,
    amount,
    method,
    payerEmail,
    payerName,
    payerPhone,
    metadata = {}
  } = orderData;
  
  // Get order details
  const Order = mongoose.model('Order');
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Create payment
  const payment = await this.create({
    referenceId: orderId,
    referenceType: 'order',
    payer: userId,
    payerEmail,
    payerName,
    payerPhone,
    recipient: order.sellers[0]?.seller,
    recipientEmail: metadata.recipientEmail,
    recipientName: metadata.recipientName,
    amount,
    currency: order.currency,
    method,
    metadata: {
      ...metadata,
      description: `Payment for order #${order.orderNumber}`
    },
    security: {
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    }
  });
  
  return payment;
};

// Static method to create payment for boost
PaymentSchema.statics.createForBoost = async function(boostData) {
  const {
    boostId,
    userId,
    amount,
    method,
    metadata = {}
  } = boostData;
  
  // Get boost details
  const Boost = mongoose.model('Boost');
  const boost = await Boost.findById(boostId).populate('product seller');
  
  if (!boost) {
    throw new Error('Boost not found');
  }
  
  // Create payment
  const payment = await this.create({
    referenceId: boostId,
    referenceType: 'boost',
    payer: userId,
    payerEmail: metadata.payerEmail,
    payerName: metadata.payerName,
    amount,
    currency: boost.currency,
    method,
    metadata: {
      ...metadata,
      description: `Payment for product boost`,
      customFields: {
        productId: boost.product._id,
        duration: boost.boostType
      }
    }
  });
  
  return payment;
};

// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = async function(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    method = null,
    status = 'completed'
  } = options;
  
  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate },
    status
  };
  
  if (method) {
    matchQuery.method = method;
  }
  
  const stats = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees.total' },
        totalNet: { $sum: '$netAmount' },
        avgPayment: { $avg: '$amount' },
        maxPayment: { $max: '$amount' },
        minPayment: { $min: '$amount' }
      }
    }
  ]);
  
  // Get payments by method
  const byMethod = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        fees: { $sum: '$fees.total' },
        net: { $sum: '$netAmount' }
      }
    },
    {
      $sort: { amount: -1 }
    }
  ]);
  
  // Get payments by reference type
  const byReferenceType = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: '$referenceType',
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    {
      $sort: { amount: -1 }
    }
  ]);
  
  // Get daily payment volume
  const dailyVolume = await this.aggregate([
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        net: { $sum: '$netAmount' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
  
  return {
    period: { startDate, endDate },
    stats: stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNet: 0,
      avgPayment: 0,
      maxPayment: 0,
      minPayment: 0
    },
    byMethod,
    byReferenceType,
    dailyVolume,
    generatedAt: new Date()
  };
};

// Static method to find failed payments for retry
PaymentSchema.statics.getFailedPayments = async function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    status: 'failed',
    createdAt: { $gte: cutoffDate },
    'webhook.attempts': { $lt: 3 } // Less than 3 retry attempts
  })
    .populate('payer', 'email name')
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = mongoose.model('Payment', PaymentSchema);