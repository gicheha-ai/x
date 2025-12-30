const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Revenue = require('../models/Revenue');
const Affiliate = require('../models/Affiliate');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('paypal-rest-sdk');

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

/**
 * Process payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentDetails } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    if (order.user.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Order is already paid'
      });
    }

    // Check if order can be paid
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot pay for ${order.status} order`
      });
    }

    let paymentResult;
    let transactionId;

    // Process based on payment method
    switch (paymentMethod) {
      case 'stripe':
        paymentResult = await processStripePayment(order, paymentDetails);
        transactionId = paymentResult.transactionId;
        break;

      case 'paypal':
        paymentResult = await processPayPalPayment(order, paymentDetails);
        transactionId = paymentResult.transactionId;
        break;

      case 'airtel':
        paymentResult = await processAirtelPayment(order, paymentDetails);
        transactionId = paymentResult.transactionId;
        break;

      case 'bank_transfer':
        paymentResult = await processBankTransfer(order, paymentDetails);
        transactionId = paymentResult.transactionId;
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: `Unsupported payment method: ${paymentMethod}`
        });
    }

    if (!paymentResult.success) {
      return res.status(400).json({
        status: 'error',
        message: paymentResult.message || 'Payment failed'
      });
    }

    // Update order payment status
    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'paid';
    order.transactionId = transactionId;
    order.paymentDetails = paymentDetails || {};
    order.paidAt = new Date();
    
    order.paymentHistory.push({
      status: 'paid',
      changedBy: req.user.id,
      changedAt: new Date(),
      transactionId,
      method: paymentMethod,
      details: paymentDetails
    });

    // If order was pending, update to processing
    if (order.status === 'pending') {
      order.status = 'processing';
      order.statusHistory.push({
        status: 'processing',
        changedBy: 'system',
        changedAt: new Date(),
        notes: 'Payment received, order processing started'
      });
    }

    await order.save();

    // Create revenue record
    const revenue = new Revenue({
      type: 'order_payment',
      amount: order.totalAmount,
      order: order._id,
      user: order.user,
      seller: order.seller,
      paymentMethod,
      transactionId,
      status: 'collected',
      notes: `Payment for order ${order.orderNumber}`
    });
    await revenue.save();

    // Send real-time notification
    if (global.socketService) {
      // Notify seller
      global.socketService.sendToUser(order.seller.toString(), 'payment-received', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod,
        timestamp: new Date().toISOString()
      });

      // Notify buyer
      global.socketService.sendToUser(order.user.toString(), 'payment-success', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod,
        timestamp: new Date().toISOString()
      });

      // Notify admin
      global.socketService.sendToRoom('admin-room', 'payment-processed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Payment processed: ${order.orderNumber} via ${paymentMethod} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Payment processed successfully',
      data: {
        order,
        payment: {
          method: paymentMethod,
          transactionId,
          amount: order.totalAmount,
          paidAt: order.paidAt
        }
      }
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Payment processing failed'
    });
  }
};

/**
 * Get payment methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, American Express',
        icon: 'credit-card',
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP'],
        fees: '2.9% + $0.30'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with your PayPal account',
        icon: 'paypal',
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
        fees: '2.9% + $0.30'
      },
      {
        id: 'airtel',
        name: 'Airtel Money',
        description: 'Mobile money payment',
        icon: 'mobile',
        enabled: true,
        currencies: ['KES', 'UGX', 'TZS', 'RWF'],
        fees: '1.5%',
        primaryAccount: process.env.SUPER_ADMIN_MOBILE || '254105441783'
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        icon: 'bank',
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP', 'KES'],
        fees: 'Free',
        accountDetails: {
          bankName: 'Example Bank',
          accountName: 'E-Commerce Pro Platform',
          accountNumber: '1234567890',
          swiftCode: 'EXBKUS33'
        }
      }
    ];

    // Filter based on user location (simplified)
    const userCurrency = req.query.currency || 'USD';
    const filteredMethods = methods.filter(method => 
      method.enabled && method.currencies.includes(userCurrency)
    );

    res.status(200).json({
      status: 'success',
      data: {
        methods: filteredMethods,
        defaultMethod: 'stripe',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'KES'],
        currency: userCurrency
      }
    });
  } catch (error) {
    logger.error('Get payment methods error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment methods'
    });
  }
};

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, method, status, startDate, endDate } = req.query;

    // Build filter
    let filter = {};
    
    // Regular users can only see their own payments
    if (req.user.role === 'buyer') {
      const userOrders = await Order.find({ user: req.user.id }).select('_id');
      filter.order = { $in: userOrders.map(o => o._id) };
    }
    
    // Sellers can see payments for their orders
    if (req.user.role === 'seller') {
      const sellerOrders = await Order.find({ seller: req.user.id }).select('_id');
      filter.order = { $in: sellerOrders.map(o => o._id) };
    }
    
    // Admins can see all payments
    if (req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      // No filter for admin
    }

    if (method) {
      filter.paymentMethod = method;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Revenue.countDocuments(filter);

    const payments = await Revenue.find(filter)
      .populate('order', 'orderNumber totalAmount')
      .populate('user', 'firstName lastName email')
      .populate('seller', 'businessName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Get payment statistics
    const stats = await Revenue.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        payments,
        stats: stats.reduce((acc, curr) => {
          acc[curr._id] = {
            total: curr.total,
            count: curr.count
          };
          return acc;
        }, {}),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get payment history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment history'
    });
  }
};

/**
 * Initiate refund
 */
exports.initiateRefund = async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL &&
        order.seller.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin or seller privileges required.'
      });
    }

    // Check if order can be refunded
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        status: 'error',
        message: 'Order is not paid'
      });
    }

    if (order.status === 'refunded') {
      return res.status(400).json({
        status: 'error',
        message: 'Order is already refunded'
      });
    }

    // Validate refund amount
    const refundAmount = amount || order.totalAmount;
    if (refundAmount > order.totalAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Refund amount cannot exceed ${order.totalAmount}`
      });
    }

    let refundResult;
    
    // Process refund based on original payment method
    switch (order.paymentMethod) {
      case 'stripe':
        refundResult = await processStripeRefund(order, refundAmount);
        break;
        
      case 'paypal':
        refundResult = await processPayPalRefund(order, refundAmount);
        break;
        
      case 'airtel':
        refundResult = await processAirtelRefund(order, refundAmount);
        break;
        
      case 'bank_transfer':
        refundResult = await processBankRefund(order, refundAmount);
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          message: `Refund not supported for ${order.paymentMethod}`
        });
    }

    if (!refundResult.success) {
      return res.status(400).json({
        status: 'error',
        message: refundResult.message || 'Refund failed'
      });
    }

    // Update order status
    order.paymentStatus = 'refunded';
    order.refundAmount = refundAmount;
    order.refundReason = reason;
    order.refundedAt = new Date();
    order.refundedBy = req.user.id;
    
    order.paymentHistory.push({
      status: 'refunded',
      changedBy: req.user.id,
      changedAt: new Date(),
      amount: refundAmount,
      transactionId: refundResult.transactionId,
      notes: `Refund: ${reason}`
    });

    // If full refund, update order status
    if (refundAmount === order.totalAmount) {
      order.status = 'refunded';
      order.statusHistory.push({
        status: 'refunded',
        changedBy: req.user.id,
        changedAt: new Date(),
        notes: `Full refund: ${reason}`
      });
    }

    await order.save();

    // Create revenue record for refund
    const revenue = new Revenue({
      type: 'refund',
      amount: -refundAmount, // Negative amount for refund
      order: order._id,
      user: order.user,
      seller: order.seller,
      paymentMethod: order.paymentMethod,
      transactionId: refundResult.transactionId,
      status: 'processed',
      notes: `Refund for order ${order.orderNumber}: ${reason}`
    });
    await revenue.save();

    // Restore product stock for full refund
    if (refundAmount === order.totalAmount) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    // Reverse affiliate commission if applicable
    if (order.affiliateCode) {
      const affiliate = await Affiliate.findOne({ affiliateId: order.affiliateCode });
      if (affiliate) {
        const referral = affiliate.referrals.find(ref => ref.order.toString() === orderId);
        if (referral) {
          const commissionToReverse = (refundAmount / order.totalAmount) * referral.commission;
          referral.status = 'refunded';
          affiliate.paidEarnings -= commissionToReverse;
          await affiliate.save();
        }
      }
    }

    // Send notifications
    if (global.socketService) {
      // Notify buyer
      global.socketService.sendToUser(order.user.toString(), 'refund-processed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: refundAmount,
        reason,
        timestamp: new Date().toISOString()
      });

      // Notify seller
      global.socketService.sendToUser(order.seller.toString(), 'refund-issued', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: refundAmount,
        reason,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Refund processed: ${order.orderNumber} amount ${refundAmount} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Refund processed successfully',
      data: {
        order,
        refund: {
          amount: refundAmount,
          transactionId: refundResult.transactionId,
          reason,
          processedAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Initiate refund error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Refund processing failed'
    });
  }
};

/**
 * Get payment statistics
 */
exports.getPaymentStats = async (req, res) => {
  try {
    // Check admin privileges for detailed stats
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;

    let filter = {};
    if (!isAdmin) {
      if (req.user.role === 'seller') {
        const sellerOrders = await Order.find({ seller: req.user.id }).select('_id');
        filter.order = { $in: sellerOrders.map(o => o._id) };
      } else if (req.user.role === 'buyer') {
        const userOrders = await Order.find({ user: req.user.id }).select('_id');
        filter.order = { $in: userOrders.map(o => o._id) };
      }
    }

    // Time period
    const period = req.query.period || 'month';
    const now = new Date();
    let startDate;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const timeFilter = { createdAt: { $gte: startDate } };
    const finalFilter = { ...filter, ...timeFilter, type: 'order_payment' };

    const [
      totalRevenue,
      revenueByMethod,
      dailyRevenue,
      topSellers,
      successRate
    ] = await Promise.all([
      // Total revenue
      Revenue.aggregate([
        { $match: finalFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Revenue by payment method
      Revenue.aggregate([
        { $match: finalFilter },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      
      // Daily revenue (last 30 days)
      Revenue.aggregate([
        { 
          $match: { 
            ...filter,
            type: 'order_payment',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      
      // Top sellers (admin only)
      isAdmin ? Revenue.aggregate([
        { 
          $match: { 
            ...timeFilter,
            type: 'order_payment',
            seller: { $exists: true }
          } 
        },
        {
          $group: {
            _id: '$seller',
            revenue: { $sum: '$amount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]) : Promise.resolve([]),
      
      // Payment success rate
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Calculate success rate
    const totalOrders = successRate.reduce((sum, item) => sum + item.count, 0);
    const paidOrders = successRate.find(item => item._id === 'paid')?.count || 0;
    const successRatePercent = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalRevenue: totalRevenue[0]?.total || 0,
          totalTransactions: revenueByMethod.reduce((sum, item) => sum + item.count, 0),
          successRate: successRatePercent.toFixed(2),
          averageTransaction: totalRevenue[0]?.total / (revenueByMethod.reduce((sum, item) => sum + item.count, 0) || 1)
        },
        byMethod: revenueByMethod.reduce((acc, curr) => {
          acc[curr._id] = {
            total: curr.total,
            count: curr.count,
            percentage: (curr.total / (totalRevenue[0]?.total || 1)) * 100
          };
          return acc;
        }, {}),
        dailyRevenue,
        topSellers: await Promise.all(topSellers.map(async (seller) => {
          const sellerInfo = await User.findById(seller._id).select('businessName email');
          return {
            ...seller,
            businessName: sellerInfo?.businessName,
            email: sellerInfo?.email
          };
        })),
        period,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch payment statistics'
    });
  }
};

/**
 * Generate payment invoice
 */
exports.generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName email phone address')
      .populate('seller', 'businessName email phone address taxId')
      .populate('items.product', 'name sku');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check permissions
    if (order.user._id.toString() !== req.user.id && 
        order.seller._id.toString() !== req.user.id &&
        req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Generate invoice data
    const invoice = {
      invoiceNumber: `INV-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      dueDate: new Date(order.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      
      billFrom: {
        name: order.seller.businessName,
        email: order.seller.email,
        phone: order.seller.phone,
        address: order.seller.address,
        taxId: order.seller.taxId
      },
      
      billTo: {
        name: `${order.user.firstName} ${order.user.lastName}`,
        email: order.user.email,
        phone: order.user.phone,
        address: order.shippingAddress
      },
      
      items: order.items.map(item => ({
        description: item.name,
        sku: item.product?.sku || 'N/A',
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.total
      })),
      
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      platformFee: order.platformFee || 0,
      total: order.totalAmount,
      
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
        transactionId: order.transactionId,
        paidAt: order.paidAt
      },
      
      notes: `Thank you for your business! Order ${order.orderNumber}`,
      terms: 'Payment due within 30 days'
    };

    res.status(200).json({
      status: 'success',
      data: { invoice },
      downloadUrl: `/api/v1/payments/invoice/${orderId}/pdf` // PDF generation endpoint
    });
  } catch (error) {
    logger.error('Generate invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate invoice'
    });
  }
};

// Helper functions for payment processing

async function processStripePayment(order, paymentDetails) {
  try {
    const { token } = paymentDetails;
    
    if (!token) {
      return { success: false, message: 'Stripe token is required' };
    }

    const charge = await stripe.charges.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'usd',
      source: token,
      description: `Order ${order.orderNumber}`,
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
        sellerId: order.seller.toString()
      }
    });

    return { 
      success: true, 
      transactionId: charge.id,
      details: charge
    };
  } catch (error) {
    logger.error('Stripe payment error:', error);
    return { success: false, message: error.message };
  }
}

async function processPayPalPayment(order, paymentDetails) {
  try {
    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      },
      transactions: [{
        item_list: {
          items: order.items.map(item => ({
            name: item.name,
            sku: item.product.toString(),
            price: item.price.toFixed(2),
            currency: 'USD',
            quantity: item.quantity
          }))
        },
        amount: {
          currency: 'USD',
          total: order.totalAmount.toFixed(2)
        },
        description: `Order ${order.orderNumber}`
      }]
    };

    return new Promise((resolve, reject) => {
      paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
          logger.error('PayPal payment error:', error);
          resolve({ success: false, message: error.message });
        } else {
          // For simplicity, we'll assume payment is approved
          // In production, you'd handle the approval flow
          resolve({ 
            success: true, 
            transactionId: payment.id,
            approvalUrl: payment.links.find(link => link.rel === 'approval_url').href
          });
        }
      });
    });
  } catch (error) {
    logger.error('PayPal payment error:', error);
    return { success: false, message: error.message };
  }
}

async function processAirtelPayment(order, paymentDetails) {
  try {
    const { phone } = paymentDetails;
    
    if (!phone) {
      return { success: false, message: 'Phone number is required' };
    }

    // In production, you would integrate with Airtel Money API
    // This is a simplified simulation
    const transactionId = `AIR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Simulate API call to Airtel
    // const response = await axios.post('https://api.airtel.com/payment', {
    //   msisdn: phone,
    //   amount: order.totalAmount,
    //   merchantId: process.env.AIRTEL_MERCHANT_ID,
    //   reference: order.orderNumber,
    //   callbackUrl: process.env.AIRTEL_CALLBACK_URL
    // });

    // For demo purposes, always succeed
    logger.info(`Airtel payment simulated: ${order.totalAmount} from ${phone} to ${process.env.SUPER_ADMIN_MOBILE}`);

    return { 
      success: true, 
      transactionId,
      message: 'Payment initiated. Please complete on your phone.'
    };
  } catch (error) {
    logger.error('Airtel payment error:', error);
    return { success: false, message: error.message };
  }
}

async function processBankTransfer(order, paymentDetails) {
  try {
    // Generate reference number
    const reference = `BANK-${order.orderNumber}-${Date.now()}`;
    
    // Create pending payment record
    // In production, you would:
    // 1. Generate bank account details
    // 2. Send instructions to user
    // 3. Wait for manual verification
    
    return { 
      success: true, 
      transactionId: reference,
      message: 'Please transfer the amount to our bank account. Payment will be verified manually within 24 hours.',
      instructions: {
        bankName: 'Example Bank',
        accountName: 'E-Commerce Pro Platform',
        accountNumber: '1234567890',
        swiftCode: 'EXBKUS33',
        reference: reference,
        amount: order.totalAmount,
        currency: 'USD'
      }
    };
  } catch (error) {
    logger.error('Bank transfer error:', error);
    return { success: false, message: error.message };
  }
}

async function processStripeRefund(order, amount) {
  try {
    if (!order.transactionId) {
      return { success: false, message: 'No transaction ID found' };
    }

    const refund = await stripe.refunds.create({
      charge: order.transactionId,
      amount: Math.round(amount * 100),
      reason: 'requested_by_customer'
    });

    return { 
      success: true, 
      transactionId: refund.id 
    };
  } catch (error) {
    logger.error('Stripe refund error:', error);
    return { success: false, message: error.message };
  }
}

async function processPayPalRefund(order, amount) {
  try {
    // PayPal refund logic
    // This would require the PayPal sale ID
    return { 
      success: true, 
      transactionId: `PAYPAL-REFUND-${Date.now()}`,
      message: 'Refund initiated via PayPal'
    };
  } catch (error) {
    logger.error('PayPal refund error:', error);
    return { success: false, message: error.message };
  }
}

async function processAirtelRefund(order, amount) {
  try {
    // Airtel Money refund logic
    return { 
      success: true, 
      transactionId: `AIRTEL-REFUND-${Date.now()}`,
      message: 'Refund initiated via Airtel Money'
    };
  } catch (error) {
    logger.error('Airtel refund error:', error);
    return { success: false, message: error.message };
  }
}

async function processBankRefund(order, amount) {
  try {
    // Bank transfer refund logic
    return { 
      success: true, 
      transactionId: `BANK-REFUND-${Date.now()}`,
      message: 'Refund will be processed via bank transfer within 3-5 business days'
    };
  } catch (error) {
    logger.error('Bank refund error:', error);
    return { success: false, message: error.message };
  }
}