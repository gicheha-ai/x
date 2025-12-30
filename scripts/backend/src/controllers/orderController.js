const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const Revenue = require('../models/Revenue');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Create a new order
 */
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      affiliateCode,
      notes
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Order must contain at least one item'
      });
    }

    // Process each item
    let totalAmount = 0;
    let totalItems = 0;
    const processedItems = [];
    const sellerIds = new Set();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.status !== 'active') {
        return res.status(400).json({
          status: 'error',
          message: `Product is not available: ${product.name}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for: ${product.name}. Available: ${product.stock}`
        });
      }

      // Calculate item total
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      totalItems += item.quantity;
      
      // Add seller to set
      sellerIds.add(product.seller.toString());

      processedItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        image: product.images[0] || null,
        seller: product.seller
      });
    }

    // Calculate shipping cost (simplified)
    const shippingCost = totalAmount > 100 ? 0 : 10; // Free shipping over $100
    const tax = totalAmount * 0.1; // 10% tax (simplified)
    const platformFee = totalAmount * 0.08; // 8% platform fee

    const grandTotal = totalAmount + shippingCost + tax;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order for each seller (split cart)
    const orders = [];
    
    for (const sellerId of sellerIds) {
      // Get items for this seller
      const sellerItems = processedItems.filter(item => item.seller.toString() === sellerId);
      const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.total, 0);
      
      // Calculate seller's share of shipping and tax (proportional)
      const sellerShipping = (sellerSubtotal / totalAmount) * shippingCost;
      const sellerTax = (sellerSubtotal / totalAmount) * tax;
      const sellerPlatformFee = sellerSubtotal * 0.08;
      const sellerTotal = sellerSubtotal + sellerShipping + sellerTax;

      const order = new Order({
        orderNumber: `${orderNumber}-${Array.from(sellerIds).indexOf(sellerId) + 1}`,
        user: req.user.id,
        seller: sellerId,
        items: sellerItems.map(item => ({
          product: item.product,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total,
          image: item.image
        })),
        subtotal: sellerSubtotal,
        shipping: sellerShipping,
        tax: sellerTax,
        platformFee: sellerPlatformFee,
        totalAmount: sellerTotal,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        affiliateCode: affiliateCode || null,
        notes,
        status: 'pending',
        paymentStatus: 'pending'
      });

      await order.save();
      orders.push(order);

      // Update product stock
      for (const item of sellerItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 
            stock: -item.quantity,
            soldCount: item.quantity
          }
        });
      }

      // Track affiliate commission if code provided
      if (affiliateCode) {
        const affiliate = await Affiliate.findOne({ affiliateId: affiliateCode });
        if (affiliate) {
          const commission = sellerSubtotal * 0.2; // 20% commission
          
          affiliate.referrals.push({
            order: order._id,
            amount: sellerSubtotal,
            commission,
            status: 'pending'
          });
          
          affiliate.pendingEarnings += commission;
          affiliate.totalEarnings += commission;
          
          await affiliate.save();

          // Create revenue record for affiliate commission
          const revenue = new Revenue({
            type: 'affiliate_commission',
            amount: commission,
            order: order._id,
            affiliate: affiliate._id,
            seller: sellerId,
            status: 'pending',
            notes: `Affiliate commission for order ${order.orderNumber}`
          });
          await revenue.save();
        }
      }

      // Create revenue record for platform fee
      const platformRevenue = new Revenue({
        type: 'platform_fee',
        amount: sellerPlatformFee,
        order: order._id,
        seller: sellerId,
        status: 'collected',
        notes: `8% platform fee for order ${order.orderNumber}`
      });
      await platformRevenue.save();

      logger.info(`Order created: ${order.orderNumber} for seller ${sellerId}`);
    }

    // Send real-time notification to sellers
    if (global.socketService) {
      for (const sellerId of sellerIds) {
        global.socketService.sendToUser(sellerId, 'new-order', {
          orderNumber,
          totalAmount: grandTotal,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Order created successfully',
      data: {
        orders,
        summary: {
          totalItems,
          subtotal: totalAmount,
          shipping: shippingCost,
          tax,
          grandTotal,
          orderNumber
        }
      }
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create order'
    });
  }
};

/**
 * Get all orders (with filters)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      seller,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter based on user role
    let filter = {};
    
    // Regular users can only see their own orders
    if (req.user.role === 'buyer') {
      filter.user = req.user.id;
    }
    
    // Sellers can only see their own orders
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    }
    
    // Admins can see all orders
    if (req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      if (seller) {
        filter.seller = seller;
      }
    }

    // Apply filters
    if (status) {
      filter.status = status;
    }
    
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const total = await Order.countDocuments(filter);

    // Get orders with populated data
    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('seller', 'businessName email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch orders'
    });
  }
};

/**
 * Get order by ID
 */
exports.getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName email phone')
      .populate('seller', 'businessName email phone address')
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isBuyer = order.user._id.toString() === req.user.id;
    const isSeller = order.seller._id.toString() === req.user.id;
    
    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Get order timeline/status history
    const timeline = [
      {
        status: 'created',
        date: order.createdAt,
        description: 'Order was created'
      },
      ...order.statusHistory
    ];

    // Get related orders (same order number prefix)
    const orderPrefix = order.orderNumber.split('-').slice(0, 2).join('-');
    const relatedOrders = await Order.find({
      orderNumber: { $regex: `^${orderPrefix}` },
      _id: { $ne: orderId }
    })
      .populate('seller', 'businessName')
      .select('orderNumber totalAmount status createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        order,
        timeline,
        relatedOrders,
        permissions: {
          canCancel: order.status === 'pending' && (isBuyer || isAdmin),
          canUpdate: isSeller || isAdmin,
          canRefund: order.status === 'completed' && (isAdmin || isSeller),
          canTrack: order.status !== 'cancelled'
        }
      }
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order'
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isSeller = order.seller.toString() === req.user.id;
    
    if (!isAdmin && !isSeller) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Only seller or admin can update order status.'
      });
    }

    // Validate status transition
    const allowedTransitions = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered'],
      'delivered': ['completed'],
      'completed': ['refunded'],
      'cancelled': [],
      'refunded': []
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot transition from ${order.status} to ${status}`
      });
    }

    // Update order status
    const oldStatus = order.status;
    order.status = status;
    
    // Add to status history
    order.statusHistory.push({
      status,
      changedBy: req.user.id,
      changedAt: new Date(),
      notes
    });

    // Handle specific status changes
    if (status === 'cancelled') {
      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
      
      // Refund affiliate commission if applicable
      if (order.affiliateCode) {
        const affiliate = await Affiliate.findOne({ affiliateId: order.affiliateCode });
        if (affiliate) {
          const referral = affiliate.referrals.find(ref => ref.order.toString() === orderId);
          if (referral && referral.status === 'pending') {
            referral.status = 'cancelled';
            affiliate.pendingEarnings -= referral.commission;
            await affiliate.save();
          }
        }
      }
      
      order.paymentStatus = 'refunded';
    }

    if (status === 'completed') {
      order.completedAt = new Date();
      order.paymentStatus = 'paid';
      
      // Release affiliate commission
      if (order.affiliateCode) {
        const affiliate = await Affiliate.findOne({ affiliateId: order.affiliateCode });
        if (affiliate) {
          const referral = affiliate.referrals.find(ref => ref.order.toString() === orderId);
          if (referral && referral.status === 'pending') {
            referral.status = 'approved';
            affiliate.pendingEarnings -= referral.commission;
            affiliate.paidEarnings += referral.commission;
            await affiliate.save();
          }
        }
      }
    }

    if (status === 'refunded') {
      // Restore product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
      
      order.paymentStatus = 'refunded';
    }

    await order.save();

    // Send real-time notifications
    if (global.socketService) {
      // Notify buyer
      global.socketService.sendToUser(order.user.toString(), 'order-status-update', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus: status,
        timestamp: new Date().toISOString()
      });

      // Notify admin
      global.socketService.sendToRoom('admin-room', 'order-updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        updatedBy: req.user.email,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Order status updated: ${order.orderNumber} from ${oldStatus} to ${status} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `Order status updated to ${status}`,
      data: { order }
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update order status'
    });
  }
};

/**
 * Update payment status
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { paymentStatus, transactionId, paymentDetails } = req.body;

    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    
    if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid payment status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Only admin can update payment status
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    const oldStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    
    if (transactionId) {
      order.transactionId = transactionId;
    }
    
    if (paymentDetails) {
      order.paymentDetails = paymentDetails;
    }

    // Record payment status change
    order.paymentHistory.push({
      status: paymentStatus,
      changedBy: req.user.id,
      changedAt: new Date(),
      transactionId,
      notes: paymentDetails?.notes
    });

    await order.save();

    // If payment is completed, update order status
    if (paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'processing';
      order.statusHistory.push({
        status: 'processing',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: 'Payment received, order processing started'
      });
      await order.save();
    }

    logger.info(`Payment status updated: ${order.orderNumber} from ${oldStatus} to ${paymentStatus} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `Payment status updated to ${paymentStatus}`,
      data: { order }
    });
  } catch (error) {
    logger.error('Update payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update payment status'
    });
  }
};

/**
 * Cancel order (Buyer or Admin)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isBuyer = order.user.toString() === req.user.id;
    const isSeller = order.seller.toString() === req.user.id;
    
    if (!isAdmin && !isBuyer && !isSeller) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Order cannot be cancelled in ${order.status} status`
      });
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.id;
    order.cancellationReason = reason;
    
    order.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user.id,
      changedAt: new Date(),
      notes: `Cancelled: ${reason}`
    });

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    // Refund payment if already paid
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      order.paymentHistory.push({
        status: 'refunded',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: 'Refund due to order cancellation'
      });
    }

    await order.save();

    // Send notifications
    if (global.socketService) {
      // Notify seller
      global.socketService.sendToUser(order.seller.toString(), 'order-cancelled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason,
        cancelledBy: req.user.email,
        timestamp: new Date().toISOString()
      });

      // Notify buyer if cancelled by seller/admin
      if (!isBuyer) {
        global.socketService.sendToUser(order.user.toString(), 'order-cancelled', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          reason,
          cancelledBy: req.user.email,
          timestamp: new Date().toISOString()
        });
      }
    }

    logger.info(`Order cancelled: ${order.orderNumber} by ${req.user.email}. Reason: ${reason}`);

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel order'
    });
  }
};

/**
 * Get order statistics
 */
exports.getOrderStats = async (req, res) => {
  try {
    let filter = {};
    let timeFilter = {};
    
    // Apply role-based filters
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    } else if (req.user.role === 'buyer') {
      filter.user = req.user.id;
    }
    
    // Admin can see all or filter by seller
    if ((req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) && req.query.seller) {
      filter.seller = req.query.seller;
    }

    // Time period filter
    const period = req.query.period || 'month'; // day, week, month, year
    const now = new Date();
    
    switch (period) {
      case 'day':
        timeFilter = { 
          createdAt: { 
            $gte: new Date(now.setHours(0, 0, 0, 0))
          } 
        };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        timeFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        timeFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        timeFilter = { createdAt: { $gte: yearAgo } };
        break;
    }

    const finalFilter = { ...filter, ...timeFilter };

    // Get statistics
    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      statusDistribution,
      dailyRevenue,
      topProducts
    ] = await Promise.all([
      // Total orders
      Order.countDocuments(finalFilter),
      
      // Total revenue
      Order.aggregate([
        { $match: { ...finalFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      
      // Pending orders
      Order.countDocuments({ ...finalFilter, status: 'pending' }),
      
      // Completed orders
      Order.countDocuments({ ...finalFilter, status: 'completed' }),
      
      // Cancelled orders
      Order.countDocuments({ ...finalFilter, status: 'cancelled' }),
      
      // Average order value
      Order.aggregate([
        { $match: { ...finalFilter, status: 'completed' } },
        { $group: { _id: null, average: { $avg: '$totalAmount' } } }
      ]),
      
      // Status distribution
      Order.aggregate([
        { $match: finalFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // Daily revenue (last 30 days)
      Order.aggregate([
        { 
          $match: { 
            ...filter,
            status: 'completed',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      
      // Top products (for sellers)
      req.user.role === 'seller' ? Order.aggregate([
        { $match: { ...finalFilter, seller: mongoose.Types.ObjectId(req.user.id) } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ]) : Promise.resolve([])
    ]);

    // Get recent orders
    const recentOrders = await Order.find(finalFilter)
      .sort('-createdAt')
      .limit(5)
      .populate('user', 'firstName lastName')
      .populate('seller', 'businessName')
      .select('orderNumber totalAmount status createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          averageOrderValue: averageOrderValue[0]?.average || 0,
          conversionRate: completedOrders / (totalOrders || 1) * 100
        },
        distribution: statusDistribution.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        dailyRevenue,
        topProducts,
        recentOrders,
        period,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get order stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order statistics'
    });
  }
};

/**
 * Get user's order history
 */
exports.getUserOrderHistory = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Check permissions
    if (req.user.id !== userId && 
        req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .populate('seller', 'businessName')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit),
      
      Order.countDocuments({ user: userId })
    ]);

    // Calculate user stats
    const userStats = await Order.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          completedOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        stats: userStats[0] || {
          totalSpent: 0,
          totalOrders: 0,
          completedOrders: 0,
          averageOrderValue: 0
        },
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get user order history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch order history'
    });
  }
};

/**
 * Bulk order actions (Admin only)
 */
exports.bulkOrderActions = async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { action, orderIds, data } = req.body;

    if (!action || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request. Provide action and order IDs.'
      });
    }

    let result;
    let message;

    switch (action) {
      case 'update-status':
        if (!data || !data.status) {
          return res.status(400).json({
            status: 'error',
            message: 'Status is required for update-status action'
          });
        }
        
        // Validate each order can be updated
        const orders = await Order.find({ _id: { $in: orderIds } });
        const validOrders = [];
        
        for (const order of orders) {
          const allowedTransitions = {
            'pending': ['processing', 'cancelled'],
            'processing': ['shipped', 'cancelled'],
            'shipped': ['delivered'],
            'delivered': ['completed'],
            'completed': ['refunded'],
            'cancelled': [],
            'refunded': []
          };
          
          if (allowedTransitions[order.status]?.includes(data.status)) {
            validOrders.push(order._id);
          }
        }
        
        if (validOrders.length === 0) {
          return res.status(400).json({
            status: 'error',
            message: 'No orders can be updated to the specified status'
          });
        }
        
        result = await Order.updateMany(
          { _id: { $in: validOrders } },
          { 
            $set: { status: data.status },
            $push: {
              statusHistory: {
                status: data.status,
                changedBy: req.user.id,
                changedAt: new Date(),
                notes: data.notes || 'Bulk update'
              }
            }
          }
        );
        message = `${result.modifiedCount} orders status updated to ${data.status}`;
        break;

      case 'update-payment-status':
        if (!data || !data.paymentStatus) {
          return res.status(400).json({
            status: 'error',
            message: 'Payment status is required for update-payment-status action'
          });
        }
        
        result = await Order.updateMany(
          { _id: { $in: orderIds } },
          { 
            $set: { paymentStatus: data.paymentStatus },
            $push: {
              paymentHistory: {
                status: data.paymentStatus,
                changedBy: req.user.id,
                changedAt: new Date(),
                notes: data.notes || 'Bulk update'
              }
            }
          }
        );
        message = `${result.modifiedCount} orders payment status updated to ${data.paymentStatus}`;
        break;

      case 'add-tracking':
        if (!data || !data.trackingNumber || !data.carrier) {
          return res.status(400).json({
            status: 'error',
            message: 'Tracking number and carrier are required for add-tracking action'
          });
        }
        
        result = await Order.updateMany(
          { 
            _id: { $in: orderIds },
            status: { $in: ['processing', 'shipped'] }
          },
          { 
            $set: { 
              trackingNumber: data.trackingNumber,
              carrier: data.carrier,
              status: 'shipped'
            },
            $push: {
              statusHistory: {
                status: 'shipped',
                changedBy: req.user.id,
                changedAt: new Date(),
                notes: `Tracking added: ${data.carrier} - ${data.trackingNumber}`
              }
            }
          }
        );
        message = `${result.modifiedCount} orders tracking added`;
        break;

      case 'export':
        // This would generate and return an export file
        message = `${orderIds.length} orders marked for export`;
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: `Invalid action: ${action}`
        });
    }

    logger.info(`Bulk order action: ${action} performed on ${orderIds.length} orders by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message,
      data: { modifiedCount: result?.modifiedCount || orderIds.length }
    });
  } catch (error) {
    logger.error('Bulk order actions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk actions'
    });
  }
};

/**
 * Search orders
 */
exports.searchOrders = async (req, res) => {
  try {
    const { query, field = 'all' } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters'
      });
    }

    // Build search filter based on user role
    let filter = {};
    
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    } else if (req.user.role === 'buyer') {
      filter.user = req.user.id;
    }
    
    // Admin can search all orders
    if (req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      // No additional filter for admin
    }

    // Build search query
    const searchFilter = {};
    
    switch (field) {
      case 'orderNumber':
        searchFilter.orderNumber = { $regex: query, $options: 'i' };
        break;
      case 'customer':
        searchFilter.$or = [
          { 'user.firstName': { $regex: query, $options: 'i' } },
          { 'user.lastName': { $regex: query, $options: 'i' } },
          { 'user.email': { $regex: query, $options: 'i' } }
        ];
        break;
      case 'product':
        searchFilter['items.name'] = { $regex: query, $options: 'i' };
        break;
      case 'all':
      default:
        searchFilter.$or = [
          { orderNumber: { $regex: query, $options: 'i' } },
          { 'items.name': { $regex: query, $options: 'i' } },
          { 'user.firstName': { $regex: query, $options: 'i' } },
          { 'user.lastName': { $regex: query, $options: 'i' } },
          { 'user.email': { $regex: query, $options: 'i' } },
          { 'seller.businessName': { $regex: query, $options: 'i' } }
        ];
        break;
    }

    const finalFilter = { ...filter, ...searchFilter };

    const orders = await Order.find(finalFilter)
      .populate('user', 'firstName lastName email')
      .populate('seller', 'businessName')
      .sort('-createdAt')
      .limit(20);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        count: orders.length,
        query,
        field
      }
    });
  } catch (error) {
    logger.error('Search orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search orders'
    });
  }
};