// backend/src/models/Cart.js
const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Session ID for guest users
  sessionId: {
    type: String,
    index: true,
    sparse: true
  },
  
  // Cart Items
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
      min: 1,
      max: 100
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
    addedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Cart Summary
  subtotal: {
    type: Number,
    default: 0,
    min: 0
  },
  
  shippingEstimate: {
    type: Number,
    default: 0,
    min: 0
  },
  
  taxEstimate: {
    type: Number,
    default: 0,
    min: 0
  },
  
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Coupon/Discount
  coupon: {
    code: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'shipping', null],
      default: null
    },
    discountValue: Number,
    minPurchase: Number,
    expiresAt: Date,
    appliedAt: Date
  },
  
  // Shipping Information
  shipping: {
    method: String,
    address: {
      type: {
        type: String,
        enum: ['home', 'work', 'other', null],
        default: null
      },
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    estimatedDelivery: Date,
    cost: {
      type: Number,
      default: 0,
      min: 0
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
  
  // Affiliate Tracking
  affiliateRef: {
    type: String,
    default: null
  },
  
  // Cart Metadata
  metadata: {
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
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  
  // Cart Status
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted', 'merged'],
    default: 'active'
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
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for item count
CartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for unique product count
CartSchema.virtual('uniqueItemCount').get(function() {
  return this.items.length;
});

// Virtual for formatted total
CartSchema.virtual('formattedTotal').get(function() {
  return `${this.currency} ${this.total.toFixed(2)}`;
});

// Virtual for formatted subtotal
CartSchema.virtual('formattedSubtotal').get(function() {
  return `${this.currency} ${this.subtotal.toFixed(2)}`;
});

// Virtual for cart age in days
CartSchema.virtual('ageInDays').get(function() {
  const age = Date.now() - this.createdAt.getTime();
  return Math.floor(age / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
CartSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for canCheckout
CartSchema.virtual('canCheckout').get(function() {
  if (this.itemCount === 0) return false;
  if (this.status !== 'active') return false;
  if (this.isExpired) return false;
  
  // Check if all items are in stock
  for (const item of this.items) {
    // In a real implementation, you would check product stock here
    // For now, we'll assume all items are available
    if (item.quantity <= 0) return false;
  }
  
  return true;
});

// Indexes
CartSchema.index({ user: 1 }, { unique: true, sparse: true });
CartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
CartSchema.index({ status: 1 });
CartSchema.index({ expiresAt: 1 });
CartSchema.index({ 'metadata.lastActive': -1 });
CartSchema.index({ createdAt: -1 });
CartSchema.index({ updatedAt: -1 });

// Pre-save middleware to calculate totals
CartSchema.pre('save', function(next) {
  // Update timestamps
  if (this.isModified()) {
    this.updatedAt = new Date();
    this.metadata.lastActive = new Date();
  }
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((total, item) => 
    total + (item.price * item.quantity), 0
  );
  
  // Apply coupon discount if exists
  let discount = 0;
  if (this.coupon && this.coupon.code) {
    const now = new Date();
    
    // Check if coupon is valid
    if (!this.coupon.expiresAt || now < this.coupon.expiresAt) {
      if (!this.coupon.minPurchase || this.subtotal >= this.coupon.minPurchase) {
        switch (this.coupon.discountType) {
          case 'percentage':
            discount = this.subtotal * (this.coupon.discountValue / 100);
            break;
          case 'fixed':
            discount = Math.min(this.coupon.discountValue, this.subtotal);
            break;
          case 'shipping':
            this.shipping.cost = 0;
            break;
        }
      }
    }
  }
  
  this.discountAmount = discount;
  
  // Calculate total
  this.total = this.subtotal + this.shipping.cost + this.taxEstimate - this.discountAmount;
  
  // Ensure non-negative total
  if (this.total < 0) {
    this.total = 0;
  }
  
  // Update expiration for active carts
  if (this.status === 'active') {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Pre-save middleware to validate stock
CartSchema.pre('save', async function(next) {
  // Skip stock validation for new carts
  if (this.isNew) {
    return next();
  }
  
  // Validate stock for each item
  const Product = mongoose.model('Product');
  
  for (const item of this.items) {
    try {
      const product = await Product.findById(item.product);
      
      if (!product || !product.isActive || product.status !== 'published') {
        // Remove unavailable product
        this.items = this.items.filter(i => 
          i.product.toString() !== item.product.toString() ||
          JSON.stringify(i.variant) !== JSON.stringify(item.variant)
        );
        continue;
      }
      
      // Check stock
      if (product.manageStock && item.quantity > product.stock && !product.allowBackorders) {
        // Adjust quantity to available stock
        item.quantity = Math.min(item.quantity, product.stock);
        
        if (item.quantity === 0) {
          // Remove out of stock item
          this.items = this.items.filter(i => 
            i.product.toString() !== item.product.toString() ||
            JSON.stringify(i.variant) !== JSON.stringify(item.variant)
          );
        }
      }
      
      // Update item price if changed
      if (item.price !== product.price) {
        item.price = product.price;
      }
      
    } catch (error) {
      console.error(`Error validating product ${item.product}:`, error);
      // Continue with other items
    }
  }
  
  next();
});

// Method to add item to cart
CartSchema.methods.addItem = async function(itemData) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === itemData.product.toString() &&
           JSON.stringify(item.variant) === JSON.stringify(itemData.variant)
  );
  
  if (existingItemIndex !== -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += itemData.quantity;
    this.items[existingItemIndex].quantity = Math.min(
      this.items[existingItemIndex].quantity, 
      100 // Max quantity per item
    );
    this.items[existingItemIndex].updatedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      ...itemData,
      addedAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return await this.save();
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = async function(productId, variant, quantity) {
  const itemIndex = this.items.findIndex(
    item => item.product.toString() === productId.toString() &&
           JSON.stringify(item.variant) === JSON.stringify(variant)
  );
  
  if (itemIndex !== -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      this.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      this.items[itemIndex].quantity = Math.min(quantity, 100); // Max 100 per item
      this.items[itemIndex].updatedAt = new Date();
    }
    
    return await this.save();
  }
  
  return false;
};

// Method to remove item from cart
CartSchema.methods.removeItem = async function(productId, variant = null) {
  const initialLength = this.items.length;
  
  this.items = this.items.filter(
    item => !(item.product.toString() === productId.toString() &&
             (variant === null || JSON.stringify(item.variant) === JSON.stringify(variant)))
  );
  
  if (this.items.length !== initialLength) {
    return await this.save();
  }
  
  return false;
};

// Method to clear cart
CartSchema.methods.clear = async function() {
  this.items = [];
  this.subtotal = 0;
  this.total = 0;
  this.discountAmount = 0;
  this.coupon = {};
  
  return await this.save();
};

// Method to apply coupon
CartSchema.methods.applyCoupon = async function(couponCode) {
  // In a real implementation, you would validate the coupon from database
  // For now, we'll use a simple validation
  
  const validCoupons = {
    'WELCOME10': { type: 'percentage', value: 10, minPurchase: 50 },
    'FREESHIP': { type: 'shipping', value: 0, minPurchase: 100 },
    'SAVE20': { type: 'fixed', value: 20, minPurchase: 100 }
  };
  
  if (validCoupons[couponCode]) {
    const coupon = validCoupons[couponCode];
    
    this.coupon = {
      code: couponCode,
      discountType: coupon.type,
      discountValue: coupon.value,
      minPurchase: coupon.minPurchase,
      appliedAt: new Date()
    };
    
    return await this.save();
  }
  
  throw new Error('Invalid coupon code');
};

// Method to remove coupon
CartSchema.methods.removeCoupon = async function() {
  this.coupon = {};
  return await this.save();
};

// Method to update shipping
CartSchema.methods.updateShipping = async function(shippingData) {
  this.shipping = {
    ...this.shipping,
    ...shippingData
  };
  
  return await this.save();
};

// Method to update billing
CartSchema.methods.updateBilling = async function(billingData) {
  this.billing = {
    ...this.billing,
    ...billingData
  };
  
  return await this.save();
};

// Method to convert to order
CartSchema.methods.convertToOrder = async function(userId) {
  if (!this.canCheckout) {
    throw new Error('Cannot convert cart to order');
  }
  
  const Order = mongoose.model('Order');
  
  // Create order from cart
  const orderData = {
    user: userId,
    items: this.items.map(item => ({
      product: item.product,
      seller: item.seller,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
      variant: item.variant,
      image: item.image,
      weight: item.weight,
      weightUnit: item.weightUnit,
      isDigital: item.isDigital
    })),
    subtotal: this.subtotal,
    shippingFee: this.shipping.cost,
    taxAmount: this.taxEstimate,
    discountAmount: this.discountAmount,
    totalAmount: this.total,
    currency: this.currency,
    shipping: {
      method: this.shipping.method,
      address: this.shipping.address,
      estimatedDelivery: this.shipping.estimatedDelivery
    },
    billing: this.billing,
    affiliateRef: this.affiliateRef,
    customerNote: '',
    status: 'pending',
    payment: {
      method: 'pending',
      status: 'pending'
    }
  };
  
  // Create order
  const order = await Order.create(orderData);
  
  // Update cart status
  this.status = 'converted';
  this.updatedAt = new Date();
  await this.save();
  
  return order;
};

// Method to merge with another cart
CartSchema.methods.mergeWith = async function(guestCart) {
  // Merge items from guest cart
  for (const item of guestCart.items) {
    await this.addItem(item);
  }
  
  // Update metadata
  this.metadata = {
    ...this.metadata,
    ...guestCart.metadata,
    lastActive: new Date()
  };
  
  // Update guest cart status
  guestCart.status = 'merged';
  await guestCart.save();
  
  return await this.save();
};

// Static method to get abandoned carts
CartSchema.statics.getAbandonedCarts = async function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    'metadata.lastActive': { $lt: cutoffDate },
    itemCount: { $gt: 0 }
  })
    .populate('user', 'name email')
    .sort({ 'metadata.lastActive': -1 })
    .lean();
};

// Static method to get cart statistics
CartSchema.statics.getCartStats = async function() {
  const stats = await this.aggregate([
    {
      $match: {
        status: 'active',
        itemCount: { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalCarts: { $sum: 1 },
        totalItems: { $sum: '$itemCount' },
        avgCartValue: { $avg: '$total' },
        maxCartValue: { $max: '$total' },
        minCartValue: { $min: '$total' },
        totalCartValue: { $sum: '$total' }
      }
    }
  ]);
  
  // Get cart conversion rate (carts created vs orders placed in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [cartsCreated, ordersPlaced] = await Promise.all([
    this.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    }),
    mongoose.model('Order').countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      status: { $ne: 'cancelled' }
    })
  ]);
  
  const conversionRate = cartsCreated > 0 
    ? (ordersPlaced / cartsCreated) * 100 
    : 0;
  
  return {
    ...(stats[0] || {
      totalCarts: 0,
      totalItems: 0,
      avgCartValue: 0,
      maxCartValue: 0,
      minCartValue: 0,
      totalCartValue: 0
    }),
    conversionRate: conversionRate.toFixed(2),
    cartsCreated,
    ordersPlaced,
    generatedAt: new Date()
  };
};

// Static method to find or create cart for user/session
CartSchema.statics.findOrCreate = async function(userId = null, sessionId = null) {
  let cart;
  
  if (userId) {
    // Find user cart
    cart = await this.findOne({ user: userId, status: 'active' });
    
    if (!cart) {
      cart = await this.create({
        user: userId,
        status: 'active'
      });
    }
  } else if (sessionId) {
    // Find session cart
    cart = await this.findOne({ sessionId, status: 'active' });
    
    if (!cart) {
      cart = await this.create({
        sessionId,
        status: 'active'
      });
    }
  } else {
    throw new Error('Either userId or sessionId is required');
  }
  
  return cart;
};

module.exports = mongoose.model('Cart', CartSchema);