const Revenue = require('../models/Revenue');
const Order = require('../models/Order');
const Boost = require('../models/Boost');
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Get revenue dashboard (Super Admin Only)
 */
exports.getRevenueDashboard = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { period = 'today', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter = { 
          createdAt: { 
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lte: new Date(now.setHours(23, 59, 59, 999))
          } 
        };
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        dateFilter = {
          createdAt: {
            $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
            $lte: new Date(yesterday.setHours(23, 59, 59, 999))
          }
        };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { createdAt: { $gte: yearAgo } };
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return res.status(400).json({
            status: 'error',
            message: 'startDate and endDate are required for custom period'
          });
        }
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
        break;
      default:
        dateFilter = { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } };
    }

    // Get revenue statistics
    const [
      totalRevenue,
      todayRevenue,
      revenueByType,
      revenueByMethod,
      dailyRevenue,
      topProducts,
      topSellers,
      activeBoosts,
      affiliateCommissions,
      subscriptionRevenue
    ] = await Promise.all([
      // Total platform revenue
      Revenue.aggregate([
        { $match: { status: 'collected' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Today's revenue
      Revenue.aggregate([
        { $match: { ...dateFilter, status: 'collected' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      // Revenue by type
      Revenue.aggregate([
        { $match: { ...dateFilter, status: 'collected' } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      
      // Revenue by payment method
      Revenue.aggregate([
        { 
          $match: { 
            ...dateFilter, 
            type: 'order_payment',
            status: 'collected' 
          } 
        },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      
      // Daily revenue for chart (last 30 days)
      Revenue.aggregate([
        { 
          $match: { 
            type: 'order_payment',
            status: 'collected',
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
      
      // Top products by revenue
      Order.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            revenue: { $sum: '$items.total' },
            quantity: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),
      
      // Top sellers by revenue
      Revenue.aggregate([
        { 
          $match: { 
            type: 'order_payment',
            status: 'collected',
            seller: { $exists: true },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
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
      ]),
      
      // Active boost sales
      Boost.countDocuments({
        expiresAt: { $gt: new Date() },
        boostType: { $ne: 'super-admin' }
      }),
      
      // Affiliate commissions
      Revenue.aggregate([
        { 
          $match: { 
            type: 'affiliate_commission',
            status: 'collected',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Subscription revenue
      Revenue.aggregate([
        { 
          $match: { 
            type: 'subscription',
            status: 'collected',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          } 
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Get recent transactions
    const recentTransactions = await Revenue.find({
      status: 'collected',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .populate('user', 'firstName lastName email')
      .populate('seller', 'businessName')
      .populate('order', 'orderNumber')
      .sort('-createdAt')
      .limit(10);

    // Get pending withdrawals
    const pendingWithdrawals = await Affiliate.aggregate([
      { $unwind: '$withdrawals' },
      { $match: { 'withdrawals.status': 'pending' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$withdrawals.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const dashboardData = {
      summary: {
        totalPlatformRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        activeBoostedProducts: activeBoosts,
        affiliateCommissionsGenerated: affiliateCommissions[0]?.total || 0,
        subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0
      },
      breakdown: {
        byType: revenueByType.reduce((acc, curr) => {
          acc[curr._id] = {
            total: curr.total,
            count: curr.count,
            percentage: (curr.total / (todayRevenue[0]?.total || 1)) * 100
          };
          return acc;
        }, {}),
        byMethod: revenueByMethod.reduce((acc, curr) => {
          acc[curr._id] = {
            total: curr.total,
            count: curr.count,
            percentage: (curr.total / (todayRevenue[0]?.total || 1)) * 100
          };
          return acc;
        }, {})
      },
      analytics: {
        dailyRevenue,
        topProducts: await Promise.all(topProducts.map(async (product) => {
          const productInfo = await mongoose.model('Product').findById(product._id).select('images');
          return {
            ...product,
            image: productInfo?.images?.[0] || null
          };
        })),
        topSellers: await Promise.all(topSellers.map(async (seller) => {
          const sellerInfo = await User.findById(seller._id).select('businessName email');
          return {
            ...seller,
            businessName: sellerInfo?.businessName,
            email: sellerInfo?.email
          };
        }))
      },
      recentTransactions,
      period,
      timestamp: new Date().toISOString(),
      superAdmin: {
        email: req.user.email,
        mobile: process.env.SUPER_ADMIN_MOBILE,
        totalCollected: totalRevenue[0]?.total || 0
      }
    };

    res.status(200).json({
      status: 'success',
      message: 'Revenue dashboard data retrieved',
      data: dashboardData
    });
  } catch (error) {
    logger.error('Get revenue dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch revenue dashboard data'
    });
  }
};

/**
 * Get revenue by date range
 */
exports.getRevenueByDateRange = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { startDate, endDate, groupBy = 'day' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range (max 365 days)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      return res.status(400).json({
        status: 'error',
        message: 'Date range cannot exceed 365 days'
      });
    }

    let groupFormat;
    switch (groupBy) {
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-%U';
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
      case 'year':
        groupFormat = '%Y';
        break;
      default:
        groupFormat = '%Y-%m-%d';
    }

    const revenueData = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$createdAt' } },
            type: '$type'
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          types: {
            $push: {
              type: '$_id.type',
              amount: '$amount',
              count: '$count'
            }
          },
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get summary statistics
    const summary = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]);

    // Get top revenue sources
    const topSources = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'seller',
          foreignField: '_id',
          as: 'sellerInfo'
        }
      },
      {
        $group: {
          _id: '$seller',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          businessName: { $first: '$sellerInfo.businessName' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        period: { startDate: start, endDate: end },
        revenueData,
        summary: summary.reduce((acc, curr) => {
          acc[curr._id] = {
            total: curr.total,
            count: curr.count,
            average: curr.average
          };
          return acc;
        }, {}),
        topSources,
        groupBy,
        totalRevenue: revenueData.reduce((sum, item) => sum + item.totalAmount, 0),
        totalTransactions: revenueData.reduce((sum, item) => sum + item.totalCount, 0)
      }
    });
  } catch (error) {
    logger.error('Get revenue by date range error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch revenue data'
    });
  }
};

/**
 * Export revenue report
 */
exports.exportRevenueReport = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { startDate, endDate, format = 'csv' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get revenue data
    const revenues = await Revenue.find({
      status: 'collected',
      createdAt: {
        $gte: start,
        $lte: end
      }
    })
      .populate('user', 'firstName lastName email')
      .populate('seller', 'businessName')
      .populate('order', 'orderNumber')
      .populate('affiliate', 'affiliateId')
      .sort('createdAt');

    // Format data based on requested format
    let reportData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['Date', 'Type', 'Amount', 'Payment Method', 'Order Number', 'Customer', 'Seller', 'Affiliate', 'Status'];
      const rows = revenues.map(rev => [
        rev.createdAt.toISOString().split('T')[0],
        rev.type,
        rev.amount,
        rev.paymentMethod || 'N/A',
        rev.order?.orderNumber || 'N/A',
        rev.user ? `${rev.user.firstName} ${rev.user.lastName}` : 'N/A',
        rev.seller?.businessName || 'N/A',
        rev.affiliate?.affiliateId || 'N/A',
        rev.status
      ]);

      reportData = [headers, ...rows].map(row => row.join(',')).join('\n');
      contentType = 'text/csv';
      filename = `revenue-report-${startDate}-to-${endDate}.csv`;
    } else if (format === 'json') {
      reportData = JSON.stringify(revenues, null, 2);
      contentType = 'application/json';
      filename = `revenue-report-${startDate}-to-${endDate}.json`;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported format. Use csv or json'
      });
    }

    // Set response headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(reportData);
  } catch (error) {
    logger.error('Export revenue report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export revenue report'
    });
  }
};

/**
 * Get real-time revenue updates
 */
exports.getRealTimeRevenue = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    // This endpoint would typically be used with WebSocket/SSE
    // For HTTP, we'll return current snapshot
    
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    // Get real-time stats
    const [
      revenueLastHour,
      recentTransactions,
      activeUsers,
      conversionRate
    ] = await Promise.all([
      // Revenue in last hour
      Revenue.aggregate([
        {
          $match: {
            status: 'collected',
            createdAt: {
              $gte: new Date(Date.now() - 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Recent transactions (last 10 minutes)
      Revenue.find({
        status: 'collected',
        createdAt: {
          $gte: new Date(Date.now() - 10 * 60 * 1000)
        }
      })
        .populate('user', 'firstName lastName')
        .populate('order', 'orderNumber')
        .sort('-createdAt')
        .limit(10),
      
      // Active users in last 15 minutes
      User.countDocuments({
        lastActive: {
          $gte: new Date(Date.now() - 15 * 60 * 1000)
        }
      }),
      
      // Conversion rate (orders/visitors)
      // This is simplified - in production you'd track visitors
      Order.countDocuments({
        createdAt: {
          $gte: todayStart,
          $lte: todayEnd
        },
        status: 'completed'
      })
    ]);

    // Calculate estimated visitors (simplified)
    const estimatedVisitors = conversionRate * 50; // Assuming 2% conversion rate
    const conversionRatePercent = estimatedVisitors > 0 ? (conversionRate / estimatedVisitors) * 100 : 0;

    res.status(200).json({
      status: 'success',
      data: {
        realTime: {
          revenueLastHour: revenueLastHour[0]?.total || 0,
          transactionsLastHour: revenueLastHour[0]?.count || 0,
          activeUsers,
          conversionRate: conversionRatePercent.toFixed(2),
          estimatedVisitors
        },
        recentTransactions,
        timestamp: new Date().toISOString(),
        updateInterval: 60000 // Suggest client to update every 60 seconds
      }
    });
  } catch (error) {
    logger.error('Get real-time revenue error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch real-time revenue data'
    });
  }
};

/**
 * Get revenue projections
 */
exports.getRevenueProjections = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { period = 'month' } = req.query; // month, quarter, year

    // Get historical data
    let daysBack;
    switch (period) {
      case 'month':
        daysBack = 90; // 3 months for monthly projection
        break;
      case 'quarter':
        daysBack = 270; // 9 months for quarterly projection
        break;
      case 'year':
        daysBack = 730; // 2 years for yearly projection
        break;
      default:
        daysBack = 90;
    }

    const historicalData = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          type: 'order_payment',
          createdAt: {
            $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate trends (simplified linear regression)
    const dataPoints = historicalData.map((data, index) => ({
      x: index,
      y: data.revenue
    }));

    // Simple average growth calculation
    const revenues = historicalData.map(d => d.revenue);
    const averageRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    
    // Calculate growth rate (simplified)
    let growthRate = 0;
    if (revenues.length > 1) {
      const firstMonthAvg = revenues.slice(0, 30).reduce((a, b) => a + b, 0) / Math.min(30, revenues.length);
      const lastMonthAvg = revenues.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, revenues.length);
      growthRate = ((lastMonthAvg - firstMonthAvg) / firstMonthAvg) * 100;
    }

    // Generate projections
    const projections = [];
    const projectionDays = period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
    
    let currentRevenue = revenues[revenues.length - 1] || averageRevenue;
    for (let i = 1; i <= projectionDays; i++) {
      const projectedDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const dailyGrowth = growthRate / 365; // Convert annual growth to daily
      currentRevenue = currentRevenue * (1 + dailyGrowth / 100);
      
      projections.push({
        date: projectedDate.toISOString().split('T')[0],
        projectedRevenue: Math.round(currentRevenue),
        confidence: 85 - (i / projectionDays) * 50 // Confidence decreases over time
      });
    }

    // Get factors affecting projections
    const growthFactors = await analyzeGrowthFactors();

    res.status(200).json({
      status: 'success',
      data: {
        historical: historicalData.slice(-30), // Last 30 days
        projections: projections.slice(0, 30), // Next 30 days
        metrics: {
          averageDailyRevenue: Math.round(averageRevenue),
          currentGrowthRate: growthRate.toFixed(2),
          projectedRevenueNextMonth: Math.round(projections[29]?.projectedRevenue || 0),
          projectedRevenueNextYear: Math.round(projections[364]?.projectedRevenue || 0),
          confidenceScore: 78 // Overall confidence score
        },
        growthFactors,
        period,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get revenue projections error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate revenue projections'
    });
  }
};

/**
 * Analyze revenue by source
 */
exports.analyzeRevenueBySource = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get revenue by source
    const revenueBySource = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            source: {
              $cond: [
                { $eq: ['$type', 'order_payment'] },
                '$paymentMethod',
                { $ifNull: ['$type', 'other'] }
              ]
            }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          averageValue: { $avg: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.type',
          sources: {
            $push: {
              source: '$_id.source',
              revenue: '$revenue',
              transactions: '$transactions',
              averageValue: '$averageValue'
            }
          },
          totalRevenue: { $sum: '$revenue' },
          totalTransactions: { $sum: '$transactions' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get trending sources (compared to previous period)
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const previousEnd = new Date(start);

    const previousRevenue = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          createdAt: {
            $gte: previousStart,
            $lt: previousEnd
          }
        }
      },
      {
        $group: {
          _id: '$type',
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate growth rates
    const growthAnalysis = revenueBySource.map(current => {
      const previous = previousRevenue.find(p => p._id === current._id);
      const previousRev = previous?.revenue || 0;
      const growth = previousRev > 0 ? ((current.totalRevenue - previousRev) / previousRev) * 100 : 100;

      return {
        type: current._id,
        currentRevenue: current.totalRevenue,
        previousRevenue: previousRev,
        growth: growth.toFixed(2),
        trend: growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable',
        contribution: (current.totalRevenue / revenueBySource.reduce((sum, item) => sum + item.totalRevenue, 0)) * 100
      };
    });

    // Get efficiency metrics
    const efficiency = await calculateRevenueEfficiency(start, end);

    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        revenueBySource,
        growthAnalysis,
        efficiency,
        summary: {
          totalRevenue: revenueBySource.reduce((sum, item) => sum + item.totalRevenue, 0),
          totalTransactions: revenueBySource.reduce((sum, item) => sum + item.totalTransactions, 0),
          averageTransactionValue: revenueBySource.reduce((sum, item) => sum + item.totalRevenue, 0) / 
                                 revenueBySource.reduce((sum, item) => sum + item.totalTransactions, 1),
          topSource: revenueBySource[0]?._id || 'N/A',
          fastestGrowing: growthAnalysis.sort((a, b) => b.growth - a.growth)[0]?.type || 'N/A'
        }
      }
    });
  } catch (error) {
    logger.error('Analyze revenue by source error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze revenue by source'
    });
  }
};

/**
 * Get super admin earnings summary
 */
exports.getSuperAdminEarnings = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { period = 'all' } = req.query;

    let dateFilter = {};
    switch (period) {
      case 'today':
        const today = new Date();
        dateFilter = {
          createdAt: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999))
          }
        };
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case 'month':
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { createdAt: { $gte: monthAgo } };
        break;
      case 'year':
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = { createdAt: { $gte: yearAgo } };
        break;
      // 'all' uses no filter
    }

    // Get all revenue collected by the platform (super admin earnings)
    const platformEarnings = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          byType: {
            $push: {
              type: '$type',
              amount: '$amount'
            }
          }
        }
      }
    ]);

    // Get breakdown by type
    const earningsByType = await Revenue.aggregate([
      {
        $match: {
          status: 'collected',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Get pending earnings (affiliate commissions not yet paid out)
    const pendingEarnings = await Affiliate.aggregate([
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pendingEarnings' }
        }
      }
    ]);

    // Get super admin's own product sales
    const superAdminProducts = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          'items.seller': mongoose.Types.ObjectId(req.user.id)
        }
      },
      {
        $group: {
          _id: null,
          productSales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Calculate net earnings (platform fees + product sales - refunds)
    const refunds = await Revenue.aggregate([
      {
        $match: {
          type: 'refund',
          status: 'collected',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalEarnings = platformEarnings[0]?.totalEarnings || 0;
    const productSales = superAdminProducts[0]?.productSales || 0;
    const totalRefunds = Math.abs(refunds[0]?.total || 0);
    const netEarnings = totalEarnings + productSales - totalRefunds;

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalEarnings,
          productSales,
          totalRefunds,
          netEarnings,
          pendingWithdrawals: pendingEarnings[0]?.totalPending || 0,
          availableBalance: netEarnings - (pendingEarnings[0]?.totalPending || 0)
        },
        breakdown: {
          byType: earningsByType.reduce((acc, curr) => {
            acc[curr._id] = {
              amount: curr.amount,
              count: curr.count,
              percentage: (curr.amount / totalEarnings) * 100
            };
            return acc;
          }, {}),
          platformFees: totalEarnings - productSales
        },
        period,
        superAdmin: {
          email: req.user.email,
          mobile: process.env.SUPER_ADMIN_MOBILE,
          totalCollectedAllTime: await Revenue.aggregate([
            { $match: { status: 'collected' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).then(res => res[0]?.total || 0)
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get super admin earnings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch super admin earnings'
    });
  }
};

// Helper functions

async function analyzeGrowthFactors() {
  // Analyze various factors affecting revenue growth
  const factors = [];

  // Factor 1: User growth
  const newUsers = await User.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  const totalUsers = await User.countDocuments();
  const userGrowthRate = totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0;
  
  factors.push({
    factor: 'User Growth',
    impact: userGrowthRate > 5 ? 'high' : userGrowthRate > 2 ? 'medium' : 'low',
    trend: userGrowthRate > 0 ? 'positive' : 'negative',
    metric: `${userGrowthRate.toFixed(1)}% new users in 30 days`
  });

  // Factor 2: Active sellers
  const activeSellers = await User.countDocuments({
    role: 'seller',
    lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  const totalSellers = await User.countDocuments({ role: 'seller' });
  const sellerActivityRate = totalSellers > 0 ? (activeSellers / totalSellers) * 100 : 0;
  
  factors.push({
    factor: 'Seller Activity',
    impact: sellerActivityRate > 70 ? 'high' : sellerActivityRate > 40 ? 'medium' : 'low',
    trend: 'stable',
    metric: `${sellerActivityRate.toFixed(0)}% active sellers`
  });

  // Factor 3: Conversion rate
  const orders = await Order.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  // Simplified conversion rate calculation
  const conversionRate = orders > 0 ? (orders / (newUsers * 10)) * 100 : 0;
  
  factors.push({
    factor: 'Conversion Rate',
    impact: conversionRate > 3 ? 'high' : conversionRate > 1 ? 'medium' : 'low',
    trend: conversionRate > 2 ? 'positive' : 'stable',
    metric: `${conversionRate.toFixed(2)}% conversion rate`
  });

  // Factor 4: Average order value
  const avgOrderValue = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$totalAmount' }
      }
    }
  ]);

  const aov = avgOrderValue[0]?.average || 0;
  factors.push({
    factor: 'Average Order Value',
    impact: aov > 100 ? 'high' : aov > 50 ? 'medium' : 'low',
    trend: aov > 80 ? 'positive' : 'stable',
    metric: `$${aov.toFixed(2)} average order value`
  });

  return factors;
}

async function calculateRevenueEfficiency(startDate, endDate) {
  // Calculate various efficiency metrics
  const metrics = {};

  // Revenue per user
  const totalUsers = await User.countDocuments({
    createdAt: { $lte: endDate }
  });
  
  const totalRevenue = await Revenue.aggregate([
    {
      $match: {
        status: 'collected',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  metrics.revenuePerUser = totalUsers > 0 ? (totalRevenue[0]?.total || 0) / totalUsers : 0;

  // Revenue per active seller
  const activeSellers = await User.countDocuments({
    role: 'seller',
    lastLogin: { $gte: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000) }
  });

  metrics.revenuePerSeller = activeSellers > 0 ? (totalRevenue[0]?.total || 0) / activeSellers : 0;

  // Customer acquisition cost (simplified)
  // In production, you'd track marketing spend
  metrics.cac = 15.50; // Example fixed value

  // Lifetime value (simplified)
  const avgOrderValue = await Order.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$totalAmount' }
      }
    }
  ]);

  const avgPurchaseFrequency = 1.2; // Example value
  const avgCustomerLifespan = 12; // Months

  metrics.ltv = (avgOrderValue[0]?.average || 0) * avgPurchaseFrequency * avgCustomerLifespan;
  metrics.ltvToCacRatio = metrics.ltv / metrics.cac;

  // Return on investment
  metrics.roi = ((totalRevenue[0]?.total || 0) - (metrics.cac * totalUsers)) / (metrics.cac * totalUsers) * 100;

  return metrics;
}