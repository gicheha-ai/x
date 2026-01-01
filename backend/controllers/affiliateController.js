// backend/src/controllers/affiliateController.js
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Revenue = require('../models/Revenue');
const TrackingLink = require('../models/TrackingLink');
const { SUPER_ADMIN_EMAIL } = require('../../config/superAdminConfig');
const { sendEmail } = require('../services/emailService');

/**
 * @desc    Register as affiliate
 * @route   POST /api/affiliate/register
 * @access  Private (Authenticated users)
 */
exports.registerAffiliate = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user.id;

    // Check if user already registered as affiliate
    const existingAffiliate = await Affiliate.findOne({ user: userId });
    if (existingAffiliate) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as an affiliate'
      });
    }

    // Generate unique affiliate code
    const affiliateCode = 'AFF' + Math.random().toString(36).substr(2, 8).toUpperCase();

    // Create affiliate profile
    const affiliate = await Affiliate.create({
      user: userId,
      affiliateCode,
      referralCode: referralCode || null,
      commissionRate: 20, // 20% commission
      totalEarnings: 0,
      availableBalance: 0,
      totalReferrals: 0,
      conversionRate: 0,
      status: 'active'
    });

    // Update user role to affiliate
    await User.findByIdAndUpdate(userId, { 
      role: 'affiliate',
      affiliateCode 
    });

    // If referral code provided, track referral
    if (referralCode) {
      const referrer = await Affiliate.findOne({ affiliateCode: referralCode });
      if (referrer) {
        referrer.totalReferrals += 1;
        await referrer.save();
      }
    }

    // Send welcome email
    const user = await User.findById(userId);
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Our Affiliate Program',
      html: `
        <h1>Welcome to Our Affiliate Program!</h1>
        <p>Your affiliate code: <strong>${affiliateCode}</strong></p>
        <p>Commission Rate: <strong>20%</strong></p>
        <p>Minimum Withdrawal: <strong>$50</strong></p>
        <p>Start sharing your affiliate links and earn commissions!</p>
        <p><a href="${process.env.FRONTEND_URL}/affiliate">Go to Affiliate Dashboard</a></p>
      `
    });

    res.status(201).json({
      success: true,
      data: affiliate,
      message: 'Successfully registered as affiliate'
    });
  } catch (error) {
    console.error('Affiliate registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get affiliate dashboard data
 * @route   GET /api/affiliate/dashboard
 * @access  Private (Affiliates only)
 */
exports.getAffiliateDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const affiliate = await Affiliate.findOne({ user: userId })
      .populate('user', 'name email avatar');
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate profile not found'
      });
    }

    // Get recent referrals with orders
    const recentReferrals = await User.find({ 
      referredBy: affiliate.affiliateCode 
    })
      .select('name email createdAt')
      .limit(10)
      .sort({ createdAt: -1 });

    // Get earnings breakdown
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEarnings = await Revenue.find({
      affiliate: affiliate._id,
      createdAt: { $gte: thirtyDaysAgo }
    })
      .populate('order', 'totalAmount')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalEarnings = affiliate.totalEarnings || 0;
    const availableBalance = affiliate.availableBalance || 0;
    const totalReferrals = affiliate.totalReferrals || 0;
    
    // Calculate conversion rate
    const convertedReferrals = recentEarnings.filter(e => e.amount > 0).length;
    const conversionRate = totalReferrals > 0 
      ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) 
      : 0;

    // Get top performing products
    const topProducts = await Product.find({ isActive: true })
      .select('name price images affiliateCommission')
      .limit(5)
      .sort({ salesCount: -1 });

    // Get affiliate links (for super admin tracking links)
    let affiliateLinks = [];
    if (req.user.email === SUPER_ADMIN_EMAIL) {
      affiliateLinks = await TrackingLink.find({ 
        generatedBy: req.user.email,
        expiresAt: { $gt: new Date() }
      })
        .select('link clicks conversions revenue createdAt expiresAt')
        .sort({ createdAt: -1 })
        .limit(10);
    }

    res.json({
      success: true,
      data: {
        affiliate,
        stats: {
          totalEarnings,
          availableBalance,
          totalReferrals,
          conversionRate,
          recentEarningsCount: recentEarnings.length
        },
        recentReferrals,
        recentEarnings,
        topProducts,
        affiliateLinks: req.user.email === SUPER_ADMIN_EMAIL ? affiliateLinks : [],
        commissionRate: affiliate.commissionRate,
        minimumWithdrawal: 50 // $50 minimum
      }
    });
  } catch (error) {
    console.error('Affiliate dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Generate affiliate link
 * @route   POST /api/affiliate/generate-link
 * @access  Private (Affiliates only)
 */
exports.generateAffiliateLink = async (req, res) => {
  try {
    const { productId, customPath } = req.body;
    const userId = req.user.id;
    const affiliate = await Affiliate.findOne({ user: userId });

    if (!affiliate) {
      return res.status(403).json({
        success: false,
        message: 'Affiliate profile not found'
      });
    }

    // Generate unique tracking token
    const token = require('crypto').randomBytes(16).toString('hex');
    const baseUrl = process.env.FRONTEND_URL || 'https://yourecommerce.com';
    
    let link;
    if (productId) {
      // Product-specific affiliate link
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      link = `${baseUrl}/product/${product.slug}?ref=${affiliate.affiliateCode}&token=${token}`;
    } else if (customPath) {
      // Custom path affiliate link
      link = `${baseUrl}/${customPath}?ref=${affiliate.affiliateCode}&token=${token}`;
    } else {
      // General affiliate link
      link = `${baseUrl}/?ref=${affiliate.affiliateCode}&token=${token}`;
    }

    // Save tracking data
    affiliate.generatedLinks.push({
      link,
      token,
      product: productId || null,
      customPath: customPath || null,
      clicks: 0,
      conversions: 0,
      revenue: 0
    });

    await affiliate.save();

    res.json({
      success: true,
      data: {
        link,
        token,
        shortLink: `yourecommerce.com/ref/${affiliate.affiliateCode}/${token.substr(0, 8)}`,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`
      },
      message: 'Affiliate link generated successfully'
    });
  } catch (error) {
    console.error('Generate affiliate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Track affiliate click
 * @route   GET /api/affiliate/track/:affiliateCode/:token
 * @access  Public
 */
exports.trackAffiliateClick = async (req, res) => {
  try {
    const { affiliateCode, token } = req.params;
    
    // Find affiliate by code
    const affiliate = await Affiliate.findOne({ affiliateCode })
      .populate('user', 'name email');
    
    if (!affiliate) {
      return res.redirect(`${process.env.FRONTEND_URL}`);
    }

    // Find the specific link
    const linkIndex = affiliate.generatedLinks.findIndex(link => 
      link.token === token || link.link.includes(token)
    );

    if (linkIndex === -1) {
      return res.redirect(`${process.env.FRONTEND_URL}`);
    }

    // Increment click count
    affiliate.generatedLinks[linkIndex].clicks += 1;
    affiliate.totalClicks = (affiliate.totalClicks || 0) + 1;
    
    // Set affiliate cookie (7 days expiry)
    res.cookie('affiliate_ref', `${affiliateCode}:${token}`, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Store session data
    req.session.affiliate = {
      affiliateCode,
      token,
      affiliateId: affiliate._id,
      clickedAt: new Date()
    };

    // Redirect to original URL (remove tracking params for clean URL)
    const redirectUrl = affiliate.generatedLinks[linkIndex].link.split('?')[0];
    await affiliate.save();
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Track affiliate click error:', error);
    res.redirect(`${process.env.FRONTEND_URL}`);
  }
};

/**
 * @desc    Get affiliate commission report
 * @route   GET /api/affiliate/commission-report
 * @access  Private (Affiliates only)
 */
exports.getCommissionReport = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const userId = req.user.id;
    
    const affiliate = await Affiliate.findOne({ user: userId });
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate profile not found'
      });
    }

    // Set date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'today':
          dateFilter.createdAt = { $gte: new Date().setHours(0, 0, 0, 0) };
          break;
        case 'week':
          dateFilter.createdAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
          break;
        case 'month':
          dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
          break;
        case 'year':
          dateFilter.createdAt = { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) };
          break;
        default:
          dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
      }
    }

    // Get commissions
    const commissions = await Revenue.find({
      affiliate: affiliate._id,
      ...dateFilter,
      source: 'affiliate'
    })
      .populate('order', 'orderNumber totalAmount products')
      .populate('product', 'name price')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pendingCommission = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);
    const paidCommission = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);

    // Get performance metrics
    const metrics = {
      totalClicks: affiliate.totalClicks || 0,
      totalConversions: commissions.length,
      conversionRate: affiliate.totalClicks > 0 
        ? ((commissions.length / affiliate.totalClicks) * 100).toFixed(2) 
        : 0,
      averageCommission: commissions.length > 0 
        ? (totalCommission / commissions.length).toFixed(2) 
        : 0,
      topProducts: []
    };

    // Find top performing products
    const productCommissions = {};
    commissions.forEach(commission => {
      if (commission.product) {
        const productId = commission.product._id.toString();
        productCommissions[productId] = (productCommissions[productId] || 0) + commission.amount;
      }
    });

    // Get top 5 products
    const topProductIds = Object.entries(productCommissions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    if (topProductIds.length > 0) {
      const topProducts = await Product.find({ _id: { $in: topProductIds } })
        .select('name price images category');
      metrics.topProducts = topProducts.map(product => ({
        product,
        commission: productCommissions[product._id.toString()]
      }));
    }

    res.json({
      success: true,
      data: {
        commissions,
        summary: {
          totalCommission,
          pendingCommission,
          paidCommission,
          availableBalance: affiliate.availableBalance
        },
        metrics,
        period,
        dateRange: {
          start: dateFilter.createdAt?.$gte || null,
          end: dateFilter.createdAt?.$lte || now
        }
      }
    });
  } catch (error) {
    console.error('Commission report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Request affiliate withdrawal
 * @route   POST /api/affiliate/withdraw
 * @access  Private (Affiliates only)
 */
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const userId = req.user.id;
    
    const affiliate = await Affiliate.findOne({ user: userId });
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate profile not found'
      });
    }

    // Validate amount
    const minWithdrawal = 50; // $50 minimum
    if (amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is $${minWithdrawal}`
      });
    }

    if (amount > affiliate.availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Check for pending withdrawals
    const pendingWithdrawals = await Revenue.find({
      affiliate: affiliate._id,
      type: 'withdrawal',
      status: 'pending'
    });

    if (pendingWithdrawals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have a pending withdrawal request'
      });
    }

    // Create withdrawal record
    const withdrawal = await Revenue.create({
      affiliate: affiliate._id,
      amount: -amount, // Negative for withdrawals
      type: 'withdrawal',
      status: 'pending',
      paymentMethod,
      paymentDetails,
      description: `Affiliate withdrawal request - ${paymentMethod}`,
      metadata: {
        requestedBy: userId,
        previousBalance: affiliate.availableBalance,
        newBalance: affiliate.availableBalance - amount
      }
    });

    // Update affiliate balance (reserve the amount)
    affiliate.availableBalance -= amount;
    affiliate.pendingWithdrawal = amount;
    await affiliate.save();

    // Send notification to admin
    const adminUsers = await User.find({ role: 'admin' });
    for (const admin of adminUsers) {
      await sendEmail({
        to: admin.email,
        subject: 'New Affiliate Withdrawal Request',
        html: `
          <h2>New Withdrawal Request</h2>
          <p><strong>Affiliate:</strong> ${req.user.name}</p>
          <p><strong>Amount:</strong> $${amount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Details:</strong> ${JSON.stringify(paymentDetails)}</p>
          <p><a href="${process.env.ADMIN_URL}/affiliate/withdrawals">Review Request</a></p>
        `
      });
    }

    // Send confirmation to affiliate
    await sendEmail({
      to: req.user.email,
      subject: 'Withdrawal Request Received',
      html: `
        <h2>Withdrawal Request Received</h2>
        <p>Your withdrawal request of <strong>$${amount}</strong> has been received.</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Status:</strong> Pending Approval</p>
        <p>We will process your request within 3-5 business days.</p>
        <p>Remaining Available Balance: <strong>$${affiliate.availableBalance}</strong></p>
      `
    });

    res.json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request submitted successfully'
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get affiliate leaderboard
 * @route   GET /api/affiliate/leaderboard
 * @access  Public
 */
exports.getAffiliateLeaderboard = async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    
    const dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter.createdAt = { $gte: new Date().setHours(0, 0, 0, 0) };
        break;
      case 'week':
        dateFilter.createdAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'all':
        // No date filter
        break;
      default:
        dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
    }

    // Get top affiliates by earnings in period
    const leaderboard = await Revenue.aggregate([
      {
        $match: {
          ...dateFilter,
          type: 'commission',
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$affiliate',
          totalEarnings: { $sum: '$amount' },
          totalReferrals: { $sum: 1 }
        }
      },
      {
        $sort: { totalEarnings: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'affiliates',
          localField: '_id',
          foreignField: '_id',
          as: 'affiliateDetails'
        }
      },
      {
        $unwind: '$affiliateDetails'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'affiliateDetails.user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 0,
          affiliateId: '$_id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          avatar: '$userDetails.avatar',
          affiliateCode: '$affiliateDetails.affiliateCode',
          totalEarnings: 1,
          totalReferrals: 1,
          rank: { $add: [1, { $indexOfArray: ['$totalEarnings', '$totalEarnings'] }] }
        }
      }
    ]);

    res.json({
      success: true,
      data: leaderboard,
      period,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get affiliate marketing materials
 * @route   GET /api/affiliate/marketing-materials
 * @access  Private (Affiliates only)
 */
exports.getMarketingMaterials = async (req, res) => {
  try {
    const userId = req.user.id;
    const affiliate = await Affiliate.findOne({ user: userId });
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate profile not found'
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://yourecommerce.com';
    const affiliateCode = affiliate.affiliateCode;

    // Pre-generated marketing materials
    const materials = {
      banners: [
        {
          name: 'Leaderboard Banner',
          url: `${baseUrl}/api/affiliate/banner/leaderboard?code=${affiliateCode}`,
          size: '728x90',
          html: `<a href="${baseUrl}/?ref=${affiliateCode}" target="_blank">
            <img src="${baseUrl}/api/affiliate/banner/leaderboard?code=${affiliateCode}" 
                 alt="Shop Now - Earn Commissions" width="728" height="90">
          </a>`
        },
        {
          name: 'Product Showcase',
          url: `${baseUrl}/api/affiliate/banner/products?code=${affiliateCode}`,
          size: '300x250',
          html: `<a href="${baseUrl}/products?ref=${affiliateCode}" target="_blank">
            <img src="${baseUrl}/api/affiliate/banner/products?code=${affiliateCode}" 
                 alt="Featured Products" width="300" height="250">
          </a>`
        },
        {
          name: 'Mobile Banner',
          url: `${baseUrl}/api/affiliate/banner/mobile?code=${affiliateCode}`,
          size: '320x50',
          html: `<a href="${baseUrl}/?ref=${affiliateCode}" target="_blank">
            <img src="${baseUrl}/api/affiliate/banner/mobile?code=${affiliateCode}" 
                 alt="Shop on Mobile" width="320" height="50">
          </a>`
        }
      ],
      textLinks: [
        {
          name: 'Homepage Link',
          url: `${baseUrl}/?ref=${affiliateCode}`,
          text: 'Shop the Best Products Online',
          html: `<a href="${baseUrl}/?ref=${affiliateCode}" target="_blank">Shop the Best Products Online</a>`
        },
        {
          name: 'Category Link',
          url: `${baseUrl}/categories?ref=${affiliateCode}`,
          text: 'Browse All Categories',
          html: `<a href="${baseUrl}/categories?ref=${affiliateCode}" target="_blank">Browse All Categories</a>`
        },
        {
          name: 'Promotion Link',
          url: `${baseUrl}/deals?ref=${affiliateCode}`,
          text: 'Exclusive Deals & Discounts',
          html: `<a href="${baseUrl}/deals?ref=${affiliateCode}" target="_blank">Exclusive Deals & Discounts</a>`
        }
      ],
      socialMedia: {
        facebook: `Share on Facebook: ${baseUrl}/?ref=${affiliateCode}`,
        twitter: `Tweet: Check out these amazing products! ${baseUrl}/?ref=${affiliateCode}`,
        instagram: `Bio link: ${baseUrl}/?ref=${affiliateCode}`,
        whatsapp: `WhatsApp message: I found this amazing store! ${baseUrl}/?ref=${affiliateCode}`
      },
      emailTemplates: [
        {
          name: 'Welcome Email',
          subject: 'Join our community and start earning!',
          body: `Hi [Name],\n\nI wanted to share this amazing platform with you. Use my referral link to get started:\n\n${baseUrl}/?ref=${affiliateCode}\n\nYou can also join our affiliate program and earn commissions!\n\nBest regards,\n[Your Name]`
        },
        {
          name: 'Product Recommendation',
          subject: 'You might like these products',
          body: `Hi [Name],\n\nI thought you might be interested in these products:\n\n${baseUrl}/products?ref=${affiliateCode}\n\nUse my link for a seamless shopping experience!\n\nBest,\n[Your Name]`
        }
      ]
    };

    // Get trending products for personalized recommendations
    const trendingProducts = await Product.find({ isActive: true })
      .select('name slug price images category affiliateCommission')
      .limit(5)
      .sort({ salesCount: -1 });

    materials.recommendedProducts = trendingProducts.map(product => ({
      name: product.name,
      url: `${baseUrl}/product/${product.slug}?ref=${affiliateCode}`,
      price: product.price,
      commission: product.affiliateCommission || 20,
      image: product.images[0] || '/images/placeholder.jpg'
    }));

    res.json({
      success: true,
      data: materials,
      affiliateCode,
      dashboardUrl: `${baseUrl}/affiliate/dashboard?code=${affiliateCode}`
    });
  } catch (error) {
    console.error('Marketing materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Process affiliate commission on order completion
 * @route   POST /api/affiliate/process-commission
 * @access  Private (System only - called from order controller)
 */
exports.processAffiliateCommission = async (orderId) => {
  try {
    const order = await Order.findById(orderId)
      .populate('user', 'email name')
      .populate('items.product', 'name price affiliateCommission seller');
    
    if (!order || order.status !== 'completed') {
      return { success: false, message: 'Order not completed' };
    }

    // Check for affiliate reference
    const affiliateRef = order.affiliateRef || order.metadata?.affiliateRef;
    if (!affiliateRef) {
      return { success: false, message: 'No affiliate reference' };
    }

    const [affiliateCode, token] = affiliateRef.split(':');
    const affiliate = await Affiliate.findOne({ affiliateCode })
      .populate('user', 'email name');

    if (!affiliate) {
      return { success: false, message: 'Affiliate not found' };
    }

    // Calculate commission
    let totalCommission = 0;
    const commissionItems = [];

    for (const item of order.items) {
      const product = item.product;
      const itemTotal = item.price * item.quantity;
      
      // Calculate commission (20% default or product-specific)
      const commissionRate = product.affiliateCommission || 20;
      const commission = (itemTotal * commissionRate) / 100;
      
      totalCommission += commission;

      commissionItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        itemTotal,
        commissionRate,
        commission
      });
    }

    // Create commission record
    const commissionRecord = await Revenue.create({
      affiliate: affiliate._id,
      order: order._id,
      amount: totalCommission,
      type: 'commission',
      status: 'pending', // Will be paid after 30-day refund period
      description: `Commission for order #${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
        customerEmail: order.user.email,
        commissionItems,
        affiliateCode,
        token
      }
    });

    // Update affiliate stats
    affiliate.totalEarnings += totalCommission;
    affiliate.availableBalance += totalCommission;
    affiliate.totalConversions = (affiliate.totalConversions || 0) + 1;
    
    // Update specific link stats if token exists
    if (token) {
      const linkIndex = affiliate.generatedLinks.findIndex(link => 
        link.token === token || link.link.includes(token)
      );
      if (linkIndex !== -1) {
        affiliate.generatedLinks[linkIndex].conversions += 1;
        affiliate.generatedLinks[linkIndex].revenue += order.totalAmount;
        affiliate.generatedLinks[linkIndex].lastConversion = new Date();
      }
    }

    await affiliate.save();

    // Send commission notification to affiliate
    await sendEmail({
      to: affiliate.user.email,
      subject: 'New Commission Earned!',
      html: `
        <h2>🎉 New Commission Earned!</h2>
        <p><strong>Order:</strong> #${order.orderNumber}</p>
        <p><strong>Customer:</strong> ${order.user.name}</p>
        <p><strong>Total Sale:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Your Commission:</strong> $${totalCommission.toFixed(2)}</p>
        <p><strong>Status:</strong> Pending (will be paid after 30-day refund period)</p>
        <p><a href="${process.env.FRONTEND_URL}/affiliate/commissions">View Details</a></p>
        <hr>
        <p>Available Balance: <strong>$${affiliate.availableBalance.toFixed(2)}</strong></p>
        <p>Total Earnings: <strong>$${affiliate.totalEarnings.toFixed(2)}</strong></p>
      `
    });

    return {
      success: true,
      commissionId: commissionRecord._id,
      amount: totalCommission,
      affiliate: affiliate.user.email
    };
  } catch (error) {
    console.error('Process affiliate commission error:', error);
    return { success: false, error: error.message };
  }
};