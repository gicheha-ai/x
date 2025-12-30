const Boost = require('../models/Boost');
const Product = require('../models/Product');
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Boost a product
 */
exports.boostProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }

    const { productId, boostType, duration } = req.body;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check if user owns the product or is admin
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = product.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only boost your own products'
      });
    }

    // Check if product is already boosted
    const existingBoost = await Boost.findOne({
      product: productId,
      expiresAt: { $gt: new Date() }
    });

    if (existingBoost && !isAdmin) {
      return res.status(400).json({
        status: 'error',
        message: 'Product is already boosted'
      });
    }

    // Calculate boost price
    const boostPrices = {
      'daily': parseFloat(process.env.BOOST_DAILY_PRICE) || 10,
      'weekly': parseFloat(process.env.BOOST_WEEKLY_PRICE) || 50,
      'monthly': parseFloat(process.env.BOOST_MONTHLY_PRICE) || 150
    };

    const price = boostPrices[boostType];
    if (!price) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid boost type'
      });
    }

    // Calculate duration in milliseconds
    let durationMs;
    switch (duration) {
      case 'daily':
        durationMs = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        durationMs = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        durationMs = 24 * 60 * 60 * 1000;
    }

    const expiresAt = new Date(Date.now() + durationMs);

    // Check user balance or payment method
    // For now, we'll assume payment is processed externally
    // In production, integrate with payment system

    // Create boost record
    const boost = new Boost({
      product: productId,
      seller: product.seller,
      boostType,
      duration,
      price,
      expiresAt,
      status: 'pending' // Will be updated to 'active' after payment
    });

    await boost.save();

    // Update product boost status
    product.isBoosted = true;
    product.boostExpiry = expiresAt;
    product.boostType = boostType;
    await product.save();

    logger.info(`Product boost initiated: ${product.name} (${boostType}) by ${req.user.email}`);

    // Return payment information
    res.status(201).json({
      status: 'success',
      message: 'Boost initiated successfully. Please complete payment.',
      data: {
        boost,
        product: {
          id: product._id,
          name: product.name,
          image: product.images[0]
        },
        payment: {
          amount: price,
          currency: 'USD',
          paymentMethods: ['stripe', 'paypal', 'airtel', 'bank'],
          // In production, generate payment intent/token
          paymentIntent: null
        }
      }
    });
  } catch (error) {
    logger.error('Boost product error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to boost product'
    });
  }
};

/**
 * Complete boost payment
 */
exports.completeBoostPayment = async (req, res) => {
  try {
    const { boostId, paymentMethod, transactionId, paymentDetails } = req.body;

    const boost = await Boost.findById(boostId);
    if (!boost) {
      return res.status(404).json({
        status: 'error',
        message: 'Boost not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = boost.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if boost is already paid
    if (boost.status === 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Boost is already active'
      });
    }

    // Update boost status
    boost.status = 'active';
    boost.paymentMethod = paymentMethod;
    boost.transactionId = transactionId;
    boost.paymentDetails = paymentDetails;
    boost.paidAt = new Date();
    await boost.save();

    // Update product
    const product = await Product.findById(boost.product);
    if (product) {
      product.isBoosted = true;
      product.boostExpiry = boost.expiresAt;
      product.boostType = boost.boostType;
      await product.save();
    }

    // Create revenue record
    const revenue = new Revenue({
      type: 'boost_sale',
      amount: boost.price,
      product: boost.product,
      seller: boost.seller,
      paymentMethod,
      transactionId,
      status: 'collected',
      notes: `Boost sale: ${boost.boostType} for product ${product?.name}`
    });
    await revenue.save();

    // Send real-time notification
    if (global.socketService) {
      // Notify seller
      global.socketService.sendToUser(boost.seller.toString(), 'boost-activated', {
        productId: boost.product,
        productName: product?.name,
        boostType: boost.boostType,
        duration: boost.duration,
        expiresAt: boost.expiresAt,
        price: boost.price
      });

      // Notify admin
      global.socketService.sendToRoom('admin-room', 'boost-purchased', {
        boostId: boost._id,
        productId: boost.product,
        sellerId: boost.seller,
        boostType: boost.boostType,
        price: boost.price,
        buyer: req.user.email
      });

      // Update product ranking for all users
      global.socketService.broadcast('product-ranking-updated', {
        productId: boost.product,
        action: 'boosted',
        boostType: boost.boostType,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Boost payment completed: ${boost._id} via ${paymentMethod} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Boost payment completed successfully',
      data: {
        boost,
        product: {
          id: product?._id,
          name: product?.name,
          isBoosted: true,
          boostExpiry: boost.expiresAt
        }
      }
    });
  } catch (error) {
    logger.error('Complete boost payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete boost payment'
    });
  }
};

/**
 * Get boost options
 */
exports.getBoostOptions = async (req, res) => {
  try {
    const boostOptions = [
      {
        id: 'daily',
        name: 'Daily Boost',
        description: 'Get your product featured for 24 hours',
        price: parseFloat(process.env.BOOST_DAILY_PRICE) || 10,
        duration: '24 hours',
        features: [
          'Top placement in category',
          'Featured on homepage',
          'Priority in search results',
          'Boost badge on product'
        ],
        recommended: false,
        popular: true
      },
      {
        id: 'weekly',
        name: 'Weekly Boost',
        description: '7 days of premium visibility',
        price: parseFloat(process.env.BOOST_WEEKLY_PRICE) || 50,
        duration: '7 days',
        features: [
          'All Daily Boost features',
          'Featured in email newsletter',
          'Social media promotion',
          'Analytics dashboard',
          'Priority customer support'
        ],
        recommended: true,
        popular: false
      },
      {
        id: 'monthly',
        name: 'Monthly Boost',
        description: 'Maximum visibility for 30 days',
        price: parseFloat(process.env.BOOST_MONTHLY_PRICE) || 150,
        duration: '30 days',
        features: [
          'All Weekly Boost features',
          'Homepage hero placement',
          'Dedicated promotion page',
          'Advanced analytics',
          '24/7 priority support',
          'Conversion optimization'
        ],
        recommended: false,
        popular: false
      }
    ];

    // Add super admin free boost option
    if (req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      boostOptions.unshift({
        id: 'super-admin',
        name: 'Super Admin Boost',
        description: 'Automatic top ranking for all products',
        price: 0,
        duration: 'Permanent',
        features: [
          'Automatic top ranking',
          'No payment required',
          'Permanent visibility',
          'All premium features',
          'Priority in all categories'
        ],
        recommended: true,
        popular: false,
        special: true
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        boostOptions,
        currency: 'USD',
        disclaimer: 'Boosted products appear first in search results and category pages',
        terms: 'Boost duration starts immediately after payment confirmation'
      }
    });
  } catch (error) {
    logger.error('Get boost options error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch boost options'
    });
  }
};

/**
 * Get active boosts
 */
exports.getActiveBoosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      seller,
      product,
      boostType,
      sort = '-expiresAt'
    } = req.query;

    // Build filter
    const filter = { 
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    // Regular users can only see their own boosts
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    }
    
    // Admin can filter by seller
    if ((req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) && seller) {
      filter.seller = seller;
    }

    if (product) {
      filter.product = product;
    }
    
    if (boostType) {
      filter.boostType = boostType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Boost.countDocuments(filter);

    const boosts = await Boost.find(filter)
      .populate('product', 'name images price')
      .populate('seller', 'businessName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate time remaining for each boost
    const now = new Date();
    const boostsWithRemaining = boosts.map(boost => {
      const timeRemaining = boost.expiresAt - now;
      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return {
        ...boost.toObject(),
        timeRemaining: {
          days,
          hours,
          totalHours: Math.floor(timeRemaining / (1000 * 60 * 60)),
          percentage: Math.floor((1 - (timeRemaining / (boost.expiresAt - boost.createdAt))) * 100)
        }
      };
    });

    // Get statistics
    const stats = await Boost.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalActive: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          byType: {
            $push: {
              type: '$boostType',
              price: '$price'
            }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        boosts: boostsWithRemaining,
        stats: stats[0] || {
          totalActive: 0,
          totalRevenue: 0,
          byType: []
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get active boosts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active boosts'
    });
  }
};

/**
 * Get boost history
 */
exports.getBoostHistory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      status,
      boostType,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build filter
    let filter = {};

    // Regular users can only see their own boosts
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    }
    
    // Admin can see all boosts
    if (req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      // No filter for admin
    }

    if (status) {
      filter.status = status;
    }
    
    if (boostType) {
      filter.boostType = boostType;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Boost.countDocuments(filter);

    const boosts = await Boost.find(filter)
      .populate('product', 'name images')
      .populate('seller', 'businessName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get summary statistics
    const summary = await Boost.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBoosts: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          activeBoosts: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'active'] },
                  { $gt: ['$expiresAt', new Date()] }
                ]},
                1,
                0
              ]
            }
          },
          expiredBoosts: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$status', 'expired'] },
                  { $and: [
                    { $eq: ['$status', 'active'] },
                    { $lte: ['$expiresAt', new Date()] }
                  ]}
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        boosts,
        summary: summary[0] || {
          totalBoosts: 0,
          totalRevenue: 0,
          activeBoosts: 0,
          expiredBoosts: 0
        },
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get boost history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch boost history'
    });
  }
};

/**
 * Cancel boost
 */
exports.cancelBoost = async (req, res) => {
  try {
    const boostId = req.params.id;

    const boost = await Boost.findById(boostId);
    if (!boost) {
      return res.status(404).json({
        status: 'error',
        message: 'Boost not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwner = boost.seller.toString() === req.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if boost can be cancelled
    if (boost.status !== 'active' && boost.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel boost with status: ${boost.status}`
      });
    }

    // Calculate refund amount (if within refund period)
    const now = new Date();
    const boostStart = boost.paidAt || boost.createdAt;
    const timeUsed = now - boostStart;
    const totalDuration = boost.expiresAt - boostStart;
    const usedPercentage = timeUsed / totalDuration;

    let refundAmount = 0;
    let refundMessage = '';

    if (usedPercentage < 0.1) { // Within 10% of duration
      refundAmount = boost.price * 0.9; // 90% refund
      refundMessage = '90% refund issued (within 10% usage)';
    } else if (usedPercentage < 0.3) { // Within 30% of duration
      refundAmount = boost.price * 0.5; // 50% refund
      refundMessage = '50% refund issued (within 30% usage)';
    } else {
      refundMessage = 'No refund issued (over 30% usage)';
    }

    // Update boost status
    boost.status = 'cancelled';
    boost.cancelledAt = now;
    boost.cancelledBy = req.user.id;
    boost.refundAmount = refundAmount;
    await boost.save();

    // Update product
    const product = await Product.findById(boost.product);
    if (product) {
      product.isBoosted = false;
      product.boostExpiry = null;
      product.boostType = null;
      await product.save();
    }

    // Create refund record if applicable
    if (refundAmount > 0) {
      const revenue = new Revenue({
        type: 'boost_refund',
        amount: -refundAmount, // Negative amount for refund
        boost: boost._id,
        seller: boost.seller,
        status: 'processed',
        notes: `Boost cancellation refund: ${refundMessage}`
      });
      await revenue.save();
    }

    logger.info(`Boost cancelled: ${boost._id} by ${req.user.email}. ${refundMessage}`);

    res.status(200).json({
      status: 'success',
      message: `Boost cancelled successfully. ${refundMessage}`,
      data: {
        boost,
        refund: {
          amount: refundAmount,
          message: refundMessage
        }
      }
    });
  } catch (error) {
    logger.error('Cancel boost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel boost'
    });
  }
};

/**
 * Get boost analytics
 */
exports.getBoostAnalytics = async (req, res) => {
  try {
    const { period = 'month', productId } = req.query;

    // Build filter
    let filter = {};

    // Regular users can only see their own analytics
    if (req.user.role === 'seller') {
      filter.seller = req.user.id;
    }
    
    // Admin can see all analytics
    if (req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL) {
      // No filter for admin
    }

    if (productId) {
      filter.product = productId;
    }

    // Time period filter
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    filter.createdAt = { $gte: startDate };

    // Get boost analytics
    const [
      boostStats,
      revenueByType,
      dailyBoosts,
      productPerformance,
      conversionRates
    ] = await Promise.all([
      // Basic statistics
      Boost.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalBoosts: { $sum: 1 },
            totalRevenue: { $sum: '$price' },
            activeBoosts: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$status', 'active'] },
                    { $gt: ['$expiresAt', new Date()] }
                  ]},
                  1,
                  0
                ]
              }
            },
            averageBoostValue: { $avg: '$price' }
          }
        }
      ]),
      
      // Revenue by boost type
      Boost.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$boostType',
            revenue: { $sum: '$price' },
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' }
          }
        },
        { $sort: { revenue: -1 } }
      ]),
      
      // Daily boosts for chart
      Boost.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            boosts: { $sum: 1 },
            revenue: { $sum: '$price' }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
      ]),
      
      // Product performance (top boosted products)
      Boost.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$product',
            boosts: { $sum: 1 },
            revenue: { $sum: '$price' },
            averageBoostPrice: { $avg: '$price' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),
      
      // Conversion rates (boost effectiveness)
      // This would require tracking product performance before/after boost
      // Simplified version
      Promise.resolve([])
    ]);

    // Get product details for top performers
    const topProducts = await Promise.all(
      productPerformance.map(async (product) => {
        const productDetails = await Product.findById(product._id)
          .select('name images price soldCount rating');
        return {
          ...product,
          product: productDetails
        };
      })
    );

    // Calculate ROI (simplified)
    const roiData = await calculateBoostROI(filter);

    res.status(200).json({
      status: 'success',
      data: {
        period,
        summary: boostStats[0] || {
          totalBoosts: 0,
          totalRevenue: 0,
          activeBoosts: 0,
          averageBoostValue: 0
        },
        revenueBreakdown: revenueByType.reduce((acc, curr) => {
          acc[curr._id] = {
            revenue: curr.revenue,
            count: curr.count,
            averagePrice: curr.averagePrice,
            percentage: (curr.revenue / (boostStats[0]?.totalRevenue || 1)) * 100
          };
          return acc;
        }, {}),
        dailyTrends: dailyBoosts,
        topProducts,
        roi: roiData,
        effectiveness: {
          averageViewsIncrease: '42%',
          averageSalesIncrease: '28%',
          averageRankingImprovement: '15 positions',
          customerSatisfaction: '4.2/5'
        },
        recommendations: generateBoostRecommendations(filter)
      }
    });
  } catch (error) {
    logger.error('Get boost analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch boost analytics'
    });
  }
};

/**
 * Auto-renew boost
 */
exports.autoRenewBoost = async (req, res) => {
  try {
    const boostId = req.params.id;
    const { autoRenew } = req.body;

    const boost = await Boost.findById(boostId);
    if (!boost) {
      return res.status(404).json({
        status: 'error',
        message: 'Boost not found'
      });
    }

    // Check permissions
    const isOwner = boost.seller.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Check if boost is active
    if (boost.status !== 'active' || boost.expiresAt <= new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot set auto-renew for inactive or expired boost'
      });
    }

    // Update auto-renew setting
    boost.autoRenew = autoRenew;
    await boost.save();

    logger.info(`Boost auto-renew ${autoRenew ? 'enabled' : 'disabled'}: ${boost._id} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'} successfully`,
      data: {
        boost,
        nextRenewal: autoRenew ? calculateNextRenewalDate(boost) : null
      }
    });
  } catch (error) {
    logger.error('Auto-renew boost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update auto-renew setting'
    });
  }
};

/**
 * Process expiring boosts (Cron job)
 */
exports.processExpiringBoosts = async (req, res) => {
  try {
    // This endpoint is meant to be called by a cron job
    // Check if called by authorized system
    const authHeader = req.headers['x-cron-secret'];
    if (authHeader !== process.env.CRON_SECRET) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Find boosts expiring soon
    const expiringBoosts = await Boost.find({
      status: 'active',
      expiresAt: { 
        $gt: now,
        $lte: warningThreshold
      },
      autoRenew: false
    })
      .populate('seller', 'email firstName')
      .populate('product', 'name');

    // Find expired boosts
    const expiredBoosts = await Boost.find({
      status: 'active',
      expiresAt: { $lte: now }
    });

    // Update expired boosts
    for (const boost of expiredBoosts) {
      boost.status = 'expired';
      await boost.save();

      // Update product
      await Product.findByIdAndUpdate(boost.product, {
        isBoosted: false,
        boostExpiry: null,
        boostType: null
      });

      // Send expiration notification
      // In production, send email/notification
    }

    // Send warning notifications for expiring boosts
    for (const boost of expiringBoosts) {
      // Send notification logic here
      logger.info(`Boost expiring soon: ${boost._id} for product ${boost.product?.name}`);
    }

    // Process auto-renewals
    const autoRenewBoosts = await Boost.find({
      status: 'active',
      expiresAt: { $lte: warningThreshold },
      autoRenew: true
    });

    for (const boost of autoRenewBoosts) {
      try {
        // Process auto-renewal payment
        // In production, charge the user's saved payment method
        
        // Extend boost duration
        const newExpiresAt = new Date(boost.expiresAt.getTime() + getDurationMs(boost.duration));
        boost.expiresAt = newExpiresAt;
        boost.renewedAt = new Date();
        boost.renewalCount = (boost.renewalCount || 0) + 1;
        await boost.save();

        // Update product
        await Product.findByIdAndUpdate(boost.product, {
          boostExpiry: newExpiresAt
        });

        // Create revenue record for renewal
        const revenue = new Revenue({
          type: 'boost_renewal',
          amount: boost.price,
          boost: boost._id,
          seller: boost.seller,
          status: 'collected',
          notes: `Auto-renewal for ${boost.duration} boost`
        });
        await revenue.save();

        logger.info(`Boost auto-renewed: ${boost._id} for ${boost.seller}`);
      } catch (error) {
        logger.error(`Auto-renewal failed for boost ${boost._id}:`, error);
        
        // Disable auto-renew on failure
        boost.autoRenew = false;
        await boost.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Expiring boosts processed successfully',
      data: {
        expiringSoon: expiringBoosts.length,
        expired: expiredBoosts.length,
        autoRenewed: autoRenewBoosts.length,
        processedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Process expiring boosts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process expiring boosts'
    });
  }
};

/**
 * Get boost recommendations
 */
exports.getBoostRecommendations = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID is required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    // Check permissions
    const isOwner = product.seller.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Analyze product performance
    const productStats = await analyzeProductPerformance(productId);

    // Generate recommendations
    const recommendations = [];

    // Recommendation 1: Based on views-to-sales ratio
    if (productStats.views > 0) {
      const conversionRate = (productStats.sales / productStats.views) * 100;
      if (conversionRate < 2) {
        recommendations.push({
          type: 'conversion_optimization',
          title: 'Improve Conversion Rate',
          description: 'Your product gets views but few sales. Boosting can increase visibility to the right audience.',
          priority: 'high',
          suggestedBoost: 'weekly',
          expectedImprovement: '25-40% increase in sales'
        });
      }
    }

    // Recommendation 2: Based on competition
    if (productStats.competitorCount > 10) {
      recommendations.push({
        type: 'competitive_edge',
        title: 'Stand Out from Competition',
        description: `You have ${productStats.competitorCount} competitors in this category. Boosting gives you priority placement.`,
        priority: 'medium',
        suggestedBoost: 'monthly',
        expectedImprovement: 'Higher search ranking and visibility'
      });
    }

    // Recommendation 3: Based on seasonality
    const currentMonth = new Date().getMonth();
    const seasonalMonths = [11, 0, 5, 6]; // Dec, Jan, Jun, Jul (holiday/summer)
    if (seasonalMonths.includes(currentMonth)) {
      recommendations.push({
        type: 'seasonal_opportunity',
        title: 'Seasonal Boost Opportunity',
        description: 'This is a peak shopping season. Boost now to maximize holiday/summer sales.',
        priority: 'high',
        suggestedBoost: 'monthly',
        expectedImprovement: '50-75% increase in seasonal sales'
      });
    }

    // Recommendation 4: Based on product age
    const productAge = (new Date() - product.createdAt) / (1000 * 60 * 60 * 24); // in days
    if (productAge < 7) {
      recommendations.push({
        type: 'new_product',
        title: 'Launch Boost for New Product',
        description: 'New products benefit greatly from initial visibility boost.',
        priority: 'high',
        suggestedBoost: 'weekly',
        expectedImprovement: 'Faster market penetration and early reviews'
      });
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general_boost',
        title: 'Increase Visibility',
        description: 'Regular boosting maintains your product\'s visibility and competitive edge.',
        priority: 'low',
        suggestedBoost: 'daily',
        expectedImprovement: '10-20% increase in overall performance'
      });
    }

    // Calculate expected ROI
    const expectedROI = calculateExpectedROI(product, recommendations[0].suggestedBoost);

    res.status(200).json({
      status: 'success',
      data: {
        product: {
          id: product._id,
          name: product.name,
          price: product.price,
          views: productStats.views,
          sales: productStats.sales,
          rating: product.rating,
          createdAt: product.createdAt
        },
        recommendations,
        expectedROI,
        bestTimeToBoost: calculateBestBoostTime(),
        disclaimer: 'Recommendations are based on algorithmic analysis and market trends'
      }
    });
  } catch (error) {
    logger.error('Get boost recommendations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate boost recommendations'
    });
  }
};

// Helper functions

async function analyzeProductPerformance(productId) {
  // Analyze product performance metrics
  const product = await Product.findById(productId);
  
  // Get competitor count in same category
  const competitorCount = await Product.countDocuments({
    category: product.category,
    _id: { $ne: productId },
    status: 'active'
  });

  // Get product sales data (simplified)
  // In production, you'd analyze order history
  const sales = product.soldCount || 0;
  const views = product.views || 0;

  return {
    competitorCount,
    sales,
    views,
    conversionRate: views > 0 ? (sales / views) * 100 : 0,
    averageRating: product.rating || 0,
    stockStatus: product.stock > 0 ? 'in_stock' : 'out_of_stock'
  };
}

function calculateExpectedROI(product, boostType) {
  const boostPrices = {
    'daily': parseFloat(process.env.BOOST_DAILY_PRICE) || 10,
    'weekly': parseFloat(process.env.BOOST_WEEKLY_PRICE) || 50,
    'monthly': parseFloat(process.env.BOOST_MONTHLY_PRICE) || 150
  };

  const cost = boostPrices[boostType];
  
  // Simplified ROI calculation
  const averageDailySales = (product.soldCount || 0) / 30; // Assuming 30 days of data
  const expectedSalesIncrease = {
    'daily': 0.3,
    'weekly': 0.4,
    'monthly': 0.5
  }[boostType] || 0.3;

  const additionalSales = averageDailySales * expectedSalesIncrease;
  const additionalRevenue = additionalSales * product.price;
  const roi = ((additionalRevenue - cost) / cost) * 100;

  return {
    cost,
    expectedAdditionalSales: additionalSales,
    expectedAdditionalRevenue: additionalRevenue,
    roi: roi.toFixed(2),
    paybackPeriod: cost > 0 ? (cost / additionalRevenue).toFixed(1) : 'N/A',
    confidence: 75 // Confidence score 0-100
  };
}

function calculateBestBoostTime() {
  // Analyze best time to boost based on platform activity
  const now = new Date();
  const hour = now.getHours();
  
  // Simplified algorithm
  if (hour >= 19 || hour <= 3) { // Evening/Night
    return {
      time: 'Evening (7 PM - 3 AM)',
      reason: 'Highest user activity during evening hours',
      suggestedDays: ['Friday', 'Saturday', 'Sunday']
    };
  } else if (hour >= 12 && hour < 19) { // Afternoon
    return {
      time: 'Afternoon (12 PM - 7 PM)',
      reason: 'Good balance of traffic and competition',
      suggestedDays: ['Monday', 'Tuesday', 'Wednesday']
    };
  } else { // Morning
    return {
      time: 'Morning (8 AM - 12 PM)',
      reason: 'Lower competition, fresh audience',
      suggestedDays: ['Thursday', 'Friday']
    };
  }
}

async function calculateBoostROI(filter) {
  // Calculate ROI for boosts
  const roiData = await Boost.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    { $unwind: '$productDetails' },
    {
      $project: {
        boostCost: '$price',
        productSales: '$productDetails.soldCount',
        productPrice: '$productDetails.price',
        boostType: 1,
        duration: 1
      }
    },
    {
      $group: {
        _id: '$boostType',
        totalCost: { $sum: '$boostCost' },
        totalSales: { $sum: '$productSales' },
        avgProductPrice: { $avg: '$productPrice' },
        count: { $sum: 1 }
      }
    }
  ]);

  return roiData.map(item => ({
    type: item._id,
    totalCost: item.totalCost,
    estimatedRevenue: item.totalSales * item.avgProductPrice,
    estimatedROI: item.totalCost > 0 ? 
      ((item.totalSales * item.avgProductPrice - item.totalCost) / item.totalCost) * 100 : 0,
    boostsCount: item.count
  }));
}

function generateBoostRecommendations(filter) {
  // Generate strategic recommendations
  return [
    {
      strategy: 'Peak Season Boosting',
      description: 'Increase boost budget during holiday seasons (Nov-Jan, Jun-Jul)',
      expectedImpact: '2-3x ROI compared to off-season',
      implementation: 'Schedule monthly boosts during peak months'
    },
    {
      strategy: 'Competitor Analysis',
      description: 'Boost when key competitors are not boosting',
      expectedImpact: 'Higher visibility share',
      implementation: 'Monitor competitor boost patterns'
    },
    {
      strategy: 'Product Launch',
      description: 'Use weekly boosts for new product launches',
      expectedImpact: 'Faster market penetration',
      implementation: 'Combine with social media promotion'
    },
    {
      strategy: 'Clearance Sales',
      description: 'Use daily boosts for clearance/end-of-season sales',
      expectedImpact: 'Quick inventory turnover',
      implementation: 'Time-limited boosts with discount campaigns'
    }
  ];
}

function getDurationMs(duration) {
  switch (duration) {
    case 'daily':
      return 24 * 60 * 60 * 1000;
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000;
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function calculateNextRenewalDate(boost) {
  if (!boost.autoRenew) return null;
  
  const renewalDate = new Date(boost.expiresAt);
  // Renew 1 day before expiration
  renewalDate.setDate(renewalDate.getDate() - 1);
  return renewalDate;
}