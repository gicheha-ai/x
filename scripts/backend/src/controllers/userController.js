const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Affiliate = require('../models/Affiliate');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Get all users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    // Filter by role
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    // Filter by status
    if (req.query.status === 'active') {
      filter.isActive = true;
    } else if (req.query.status === 'inactive') {
      filter.isActive = false;
    }
    
    // Filter by email verification
    if (req.query.verified === 'true') {
      filter.emailVerified = true;
    } else if (req.query.verified === 'false') {
      filter.emailVerified = false;
    }
    
    // Search by email or name
    if (req.query.search) {
      filter.$or = [
        { email: { $regex: req.query.search, $options: 'i' } },
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Get user by ID (Admin only or own profile)
 */
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL && 
        req.user.id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get additional stats based on user role
    let stats = {};
    
    if (user.role === 'seller') {
      const [productCount, orderCount, totalRevenue] = await Promise.all([
        Product.countDocuments({ seller: userId }),
        Order.countDocuments({ seller: userId, status: 'completed' }),
        Order.aggregate([
          { $match: { seller: userId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);
      
      stats = {
        productCount,
        orderCount,
        totalRevenue: totalRevenue[0]?.total || 0
      };
    } else if (user.role === 'affiliate' || user.affiliateId) {
      const affiliate = await Affiliate.findOne({ userId });
      if (affiliate) {
        stats = {
          totalEarnings: affiliate.totalEarnings,
          pendingEarnings: affiliate.pendingEarnings,
          paidEarnings: affiliate.paidEarnings,
          referralCount: affiliate.referrals.length
        };
      }
    } else if (user.role === 'buyer') {
      const orderCount = await Order.countDocuments({ user: userId });
      stats = { orderCount };
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
        stats
      }
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user'
    });
  }
};

/**
 * Update user (Admin only or own profile)
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Check permissions
    const isAdmin = req.user.role === 'admin' || req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isOwnProfile = req.user.id === userId;
    
    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Non-admin users cannot update certain fields
    if (!isAdmin) {
      delete updates.role;
      delete updates.isSuperAdmin;
      delete updates.isActive;
      delete updates.emailVerified;
      delete updates.affiliateId;
      delete updates.subscriptionTier;
    }

    // Admins cannot modify super admin status
    if (isAdmin && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      const targetUser = await User.findById(userId);
      if (targetUser && targetUser.email === process.env.SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          status: 'error',
          message: 'Cannot modify super admin account'
        });
      }
    }

    // Super admin cannot be modified
    if (updates.email && updates.email === process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Super admin email cannot be changed'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete user (Admin only)
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Prevent deleting super admin
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (userToDelete.email === process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete super admin account'
      });
    }

    // Soft delete (deactivate)
    userToDelete.isActive = false;
    userToDelete.deactivatedAt = new Date();
    await userToDelete.save();

    // Archive user data (optional)
    // await ArchiveUser.create({ ...userToDelete.toObject(), archivedBy: req.user.id });

    logger.info(`User deactivated: ${userToDelete.email} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
};

/**
 * Get user statistics (Admin only)
 */
exports.getUserStats = async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Get user counts by role
    const [buyers, sellers, affiliates, admins] = await Promise.all([
      User.countDocuments({ role: 'buyer', isActive: true }),
      User.countDocuments({ role: 'seller', isActive: true }),
      User.countDocuments({ role: 'affiliate', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true })
    ]);

    // Get new users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Get user growth data for chart
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          isActive: true
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Get user activity stats
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      isActive: true
    });

    // Get subscription tier counts
    const subscriptionStats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$subscriptionTier',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totals: {
          buyers,
          sellers,
          affiliates,
          admins,
          total: buyers + sellers + affiliates + admins
        },
        growth: {
          newUsersLast30Days: newUsers,
          activeUsersLast7Days: activeUsers,
          dailyGrowth: userGrowth
        },
        subscriptions: subscriptionStats.reduce((acc, curr) => {
          acc[curr._id || 'free'] = curr.count;
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user statistics'
    });
  }
};

/**
 * Get seller statistics
 */
exports.getSellerStats = async (req, res) => {
  try {
    const sellerId = req.params.id || req.user.id;

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL && 
        req.user.id !== sellerId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Verify user is a seller
    const user = await User.findById(sellerId);
    if (!user || user.role !== 'seller') {
      return res.status(404).json({
        status: 'error',
        message: 'Seller not found'
      });
    }

    // Get product statistics
    const productStats = await Product.aggregate([
      { $match: { seller: user._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          outOfStock: { 
            $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
          },
          averageRating: { $avg: '$rating' },
          totalRevenue: { $sum: { $multiply: ['$price', '$soldCount'] } }
        }
      }
    ]);

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { seller: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get recent sales
    const recentSales = await Order.find({ seller: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email')
      .select('orderNumber totalAmount status createdAt');

    // Get monthly revenue
    const monthlyRevenue = await Order.aggregate([
      { 
        $match: { 
          seller: user._id,
          status: 'completed',
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate commission earned (8% of completed orders)
    const commissionEarned = await Order.aggregate([
      { 
        $match: { 
          seller: user._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$totalAmount', 0.08] } }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        seller: {
          id: user._id,
          email: user.email,
          businessName: user.businessName,
          joined: user.createdAt
        },
        products: productStats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          outOfStock: 0,
          averageRating: 0,
          totalRevenue: 0
        },
        orders: orderStats.reduce((acc, curr) => {
          acc[curr._id] = {
            count: curr.count,
            totalAmount: curr.totalAmount || 0
          };
          return acc;
        }, {}),
        recentSales,
        monthlyRevenue,
        commissions: {
          totalPaid: commissionEarned[0]?.total || 0,
          rate: '8%',
          nextPayment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        },
        performance: {
          conversionRate: '2.5%', // This would be calculated from analytics
          averageOrderValue: 125.50,
          customerSatisfaction: '4.5/5'
        }
      }
    });
  } catch (error) {
    logger.error('Get seller stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch seller statistics'
    });
  }
};

/**
 * Get buyer statistics
 */
exports.getBuyerStats = async (req, res) => {
  try {
    const buyerId = req.params.id || req.user.id;

    // Check permissions
    if (req.user.role !== 'admin' && 
        req.user.email !== process.env.SUPER_ADMIN_EMAIL && 
        req.user.id !== buyerId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { user: buyerId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get recent orders
    const recentOrders = await Order.find({ user: buyerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('seller', 'businessName')
      .select('orderNumber totalAmount status createdAt items');

    // Get favorite categories
    const favoriteCategories = await Order.aggregate([
      { $match: { user: buyerId } },
      { $unwind: '$items' },
      { $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.category',
          count: { $sum: '$items.quantity' },
          totalSpent: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get wishlist count
    const wishlistCount = await User.findById(buyerId)
      .select('wishlist')
      .then(user => user?.wishlist?.length || 0);

    res.status(200).json({
      status: 'success',
      data: {
        overview: orderStats[0] || {
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0
        },
        recentOrders,
        favoriteCategories,
        wishlist: {
          count: wishlistCount
        },
        loyalty: {
          level: 'Silver', // Based on total spent
          points: 1250,
          nextLevel: 'Gold',
          pointsNeeded: 750
        }
      }
    });
  } catch (error) {
    logger.error('Get buyer stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch buyer statistics'
    });
  }
};

/**
 * Bulk user actions (Admin only)
 */
exports.bulkUserActions = async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { action, userIds, data } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request. Provide action and user IDs.'
      });
    }

    // Prevent modifying super admin
    const superAdmin = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
    if (userIds.includes(superAdmin._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot perform bulk actions on super admin'
      });
    }

    let result;
    let message;

    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: true, deactivatedAt: null } }
        );
        message = `${result.modifiedCount} users activated`;
        break;

      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: false, deactivatedAt: new Date() } }
        );
        message = `${result.modifiedCount} users deactivated`;
        break;

      case 'verify-email':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { emailVerified: true } }
        );
        message = `${result.modifiedCount} users email verified`;
        break;

      case 'change-role':
        if (!data || !data.role) {
          return res.status(400).json({
            status: 'error',
            message: 'Role is required for change-role action'
          });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { role: data.role } }
        );
        message = `${result.modifiedCount} users role changed to ${data.role}`;
        break;

      case 'assign-affiliate':
        // Generate affiliate IDs for users
        const users = await User.find({ _id: { $in: userIds } });
        const updates = users.map(user => ({
          updateOne: {
            filter: { _id: user._id },
            update: { 
              $set: { 
                affiliateId: `AFF-${user._id.toString().slice(-6).toUpperCase()}`,
                role: 'affiliate'
              }
            }
          }
        }));
        
        result = await User.bulkWrite(updates);
        message = `${updates.length} users assigned affiliate IDs`;
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: `Invalid action: ${action}`
        });
    }

    logger.info(`Bulk user action: ${action} performed by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message,
      data: { modifiedCount: result.modifiedCount || updates.length }
    });
  } catch (error) {
    logger.error('Bulk user actions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk actions'
    });
  }
};