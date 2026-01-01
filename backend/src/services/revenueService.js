const Revenue = require('../models/Revenue');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Boost = require('../models/Boost');
const User = require('../models/User');
const mongoose = require('mongoose');

class RevenueService {
  // ==================== REVENUE CALCULATION ====================
  
  /**
   * Calculate total platform revenue
   */
  async calculateTotalRevenue(adminUser) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      // Total from revenue collection
      const totalRevenue = await Revenue.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Revenue by source
      const revenueBySource = await Revenue.aggregate([
        {
          $group: {
            _id: '$source',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      // Revenue by payment method
      const revenueByMethod = await Revenue.aggregate([
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      // Monthly revenue trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const monthlyTrend = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$recordedAt' },
              month: { $month: '$recordedAt' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: {
                  $dateFromParts: {
                    year: '$_id.year',
                    month: '$_id.month',
                    day: 1
                  }
                }
              }
            },
            total: 1,
            count: 1,
            _id: 0
          }
        }
      ]);

      // Top revenue generating users (excluding super admin)
      const topUsers = await Revenue.aggregate([
        {
          $match: {
            user: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$user',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { total: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $project: {
            userId: '$_id',
            userEmail: '$userDetails.email',
            userName: '$userDetails.name',
            total: 1,
            count: 1,
            _id: 0
          }
        }
      ]);

      return {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions: totalRevenue[0]?.count || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        todayTransactions: todayRevenue[0]?.count || 0,
        revenueBySource,
        revenueByMethod,
        monthlyTrend,
        topUsers,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Revenue calculation error:', error);
      throw error;
    }
  }

  // ==================== BOOST SALES REVENUE ====================
  
  /**
   * Calculate boost sales revenue
   */
  async calculateBoostRevenue(timeframe = 'all') {
    try {
      let matchCriteria = {};
      
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        
        matchCriteria.createdAt = { $gte: startDate };
      }

      const boostRevenue = await Boost.aggregate([
        {
          $match: {
            ...matchCriteria,
            status: 'active'
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            dailyRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$duration', 'daily'] },
                  '$amount',
                  0
                ]
              }
            },
            weeklyRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$duration', 'weekly'] },
                  '$amount',
                  0
                ]
              }
            },
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$duration', 'monthly'] },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]);

      // Active boosted products count
      const activeBoosts = await Boost.countDocuments({
        status: 'active',
        endDate: { $gt: new Date() }
      });

      // Boost revenue by user
      const boostByUser = await Boost.aggregate([
        {
          $match: {
            ...matchCriteria,
            status: 'active'
          }
        },
        {
          $group: {
            _id: '$user',
            totalSpent: { $sum: '$amount' },
            boostCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalSpent: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $project: {
            userId: '$_id',
            userEmail: '$userDetails.email',
            userName: '$userDetails.name',
            totalSpent: 1,
            boostCount: 1,
            _id: 0
          }
        }
      ]);

      return {
        totalBoostRevenue: boostRevenue[0]?.totalAmount || 0,
        totalBoosts: boostRevenue[0]?.count || 0,
        activeBoosts,
        dailyBoostRevenue: boostRevenue[0]?.dailyRevenue || 0,
        weeklyBoostRevenue: boostRevenue[0]?.weeklyRevenue || 0,
        monthlyBoostRevenue: boostRevenue[0]?.monthlyRevenue || 0,
        topBoostUsers: boostByUser,
        timeframe
      };
    } catch (error) {
      console.error('Boost revenue calculation error:', error);
      throw error;
    }
  }

  // ==================== AFFILIATE COMMISSIONS ====================
  
  /**
   * Calculate affiliate commissions revenue
   */
  async calculateAffiliateRevenue(timeframe = 'all') {
    try {
      let matchCriteria = {};
      
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        
        matchCriteria.createdAt = { $gte: startDate };
      }

      // Revenue from affiliate commissions (20% of referred sales)
      // This is revenue for the platform from sellers paying affiliate commissions
      const affiliateRevenue = await Revenue.aggregate([
        {
          $match: {
            ...matchCriteria,
            source: 'affiliate_commission'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgCommission: { $avg: '$amount' }
          }
        }
      ]);

      // Top affiliate referrers
      const topAffiliates = await Revenue.aggregate([
        {
          $match: {
            ...matchCriteria,
            source: 'affiliate_commission'
          }
        },
        {
          $group: {
            _id: '$user',
            totalCommissions: { $sum: '$amount' },
            referralCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalCommissions: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $project: {
            affiliateId: '$_id',
            affiliateEmail: '$userDetails.email',
            affiliateName: '$userDetails.name',
            totalCommissions: 1,
            referralCount: 1,
            _id: 0
          }
        }
      ]);

      // Affiliate performance by month
      const affiliateTrend = await Revenue.aggregate([
        {
          $match: {
            source: 'affiliate_commission',
            recordedAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$recordedAt' },
              month: { $month: '$recordedAt' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        },
        {
          $project: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: {
                  $dateFromParts: {
                    year: '$_id.year',
                    month: '$_id.month',
                    day: 1
                  }
                }
              }
            },
            total: 1,
            count: 1,
            _id: 0
          }
        }
      ]);

      return {
        totalAffiliateRevenue: affiliateRevenue[0]?.total || 0,
        totalAffiliateTransactions: affiliateRevenue[0]?.count || 0,
        averageCommission: affiliateRevenue[0]?.avgCommission || 0,
        topAffiliates,
        affiliateTrend,
        timeframe
      };
    } catch (error) {
      console.error('Affiliate revenue calculation error:', error);
      throw error;
    }
  }

  // ==================== SUBSCRIPTION REVENUE ====================
  
  /**
   * Calculate subscription revenue
   */
  async calculateSubscriptionRevenue(timeframe = 'all') {
    try {
      let matchCriteria = {};
      
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        
        matchCriteria.createdAt = { $gte: startDate };
      }

      // Get users with premium subscriptions
      const premiumUsers = await User.aggregate([
        {
          $match: {
            ...matchCriteria,
            subscriptionTier: { $in: ['premium', 'enterprise'] },
            subscriptionStatus: 'active'
          }
        },
        {
          $group: {
            _id: '$subscriptionTier',
            userCount: { $sum: 1 },
            totalMRR: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$subscriptionTier', 'premium'] }, then: 29 },
                    { case: { $eq: ['$subscriptionTier', 'enterprise'] }, then: 99 }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ]);

      // Subscription revenue from payments
      const subscriptionRevenue = await Revenue.aggregate([
        {
          $match: {
            ...matchCriteria,
            source: 'subscription'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        }
      ]);

      // Active subscriptions count
      const activeSubscriptions = await User.countDocuments({
        subscriptionStatus: 'active',
        subscriptionTier: { $ne: 'free' }
      });

      // Churn rate calculation (simplified)
      const totalSubscribers = await User.countDocuments({
        subscriptionTier: { $ne: 'free' }
      });
      
      const churnedSubscribers = await User.countDocuments({
        subscriptionStatus: 'cancelled'
      });
      
      const churnRate = totalSubscribers > 0 ? 
        (churnedSubscribers / totalSubscribers) * 100 : 0;

      return {
        totalSubscriptionRevenue: subscriptionRevenue[0]?.total || 0,
        totalSubscriptions: subscriptionRevenue[0]?.count || 0,
        averageSubscriptionValue: subscriptionRevenue[0]?.avgAmount || 0,
        premiumUsers: premiumUsers,
        activeSubscriptions,
        monthlyRecurringRevenue: premiumUsers.reduce((sum, tier) => sum + tier.totalMRR, 0),
        churnRate: parseFloat(churnRate.toFixed(2)),
        timeframe
      };
    } catch (error) {
      console.error('Subscription revenue calculation error:', error);
      throw error;
    }
  }

  // ==================== TRANSACTION FEES REVENUE ====================
  
  /**
   * Calculate transaction fees revenue
   */
  async calculateTransactionFees(timeframe = 'all') {
    try {
      let matchCriteria = {};
      
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        }
        
        matchCriteria.createdAt = { $gte: startDate };
      }

      const transactionFees = await Revenue.aggregate([
        {
          $match: {
            ...matchCriteria,
            source: 'transaction_fee'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgFee: { $avg: '$amount' }
          }
        }
      ]);

      // Fees by payment method
      const feesByMethod = await Revenue.aggregate([
        {
          $match: {
            ...matchCriteria,
            source: 'transaction_fee'
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            avgFee: { $avg: '$amount' }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      // Daily transaction fee trend
      const dailyFeeTrend = await Revenue.aggregate([
        {
          $match: {
            source: 'transaction_fee',
            recordedAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        },
        {
          $project: {
            date: '$_id',
            total: 1,
            count: 1,
            _id: 0
          }
        }
      ]);

      return {
        totalTransactionFees: transactionFees[0]?.total || 0,
        totalFeeTransactions: transactionFees[0]?.count || 0,
        averageFee: transactionFees[0]?.avgFee || 0,
        feesByMethod,
        dailyFeeTrend,
        timeframe
      };
    } catch (error) {
      console.error('Transaction fees calculation error:', error);
      throw error;
    }
  }

  // ==================== COMPREHENSIVE REVENUE REPORT ====================
  
  /**
   * Generate comprehensive revenue report for super admin
   */
  async generateRevenueReport(adminUser, options = {}) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const {
        timeframe = 'monthly',
        startDate,
        endDate = new Date()
      } = options;

      // Set date range
      let dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
        dateFilter.$lte = new Date(endDate);
      } else {
        const now = new Date();
        let calculatedStartDate;
        
        switch (timeframe) {
          case 'daily':
            calculatedStartDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'weekly':
            calculatedStartDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'monthly':
            calculatedStartDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'quarterly':
            calculatedStartDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case 'yearly':
            calculatedStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            calculatedStartDate = new Date(now.setMonth(now.getMonth() - 1));
        }
        
        dateFilter = {
          $gte: calculatedStartDate,
          $lte: new Date()
        };
      }

      // Get all revenue data for the period
      const allRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: dateFilter
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            sources: {
              $push: {
                source: '$source',
                amount: '$amount',
                method: '$paymentMethod'
              }
            }
          }
        }
      ]);

      // Breakdown by source
      const breakdownBySource = await Revenue.aggregate([
        {
          $match: {
            recordedAt: dateFilter
          }
        },
        {
          $group: {
            _id: '$source',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
            percentage: {
              $avg: {
                $multiply: [
                  {
                    $divide: ['$amount', allRevenue[0]?.totalRevenue || 1]
                  },
                  100
                ]
              }
            }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      // Revenue growth compared to previous period
      const previousPeriodEnd = dateFilter.$gte;
      const previousPeriodStart = new Date(previousPeriodEnd);
      
      if (timeframe === 'daily') {
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
      } else if (timeframe === 'weekly') {
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
      } else if (timeframe === 'monthly') {
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      } else if (timeframe === 'yearly') {
        previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
      }

      const previousPeriodRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: {
              $gte: previousPeriodStart,
              $lte: previousPeriodEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const currentRevenue = allRevenue[0]?.totalRevenue || 0;
      const previousRevenue = previousPeriodRevenue[0]?.total || 0;
      const growthRate = previousRevenue > 0 ? 
        ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 100;

      // Projections
      const dailyAverage = timeframe === 'daily' ? currentRevenue : 
        currentRevenue / (timeframe === 'weekly' ? 7 : 
          timeframe === 'monthly' ? 30 : 365);
      
      const monthlyProjection = dailyAverage * 30;
      const yearlyProjection = dailyAverage * 365;

      // Platform health metrics
      const activeSellers = await User.countDocuments({
        userType: 'seller',
        isActive: true
      });
      
      const activeBuyers = await User.countDocuments({
        userType: 'buyer',
        isActive: true
      });
      
      const totalProducts = await mongoose.model('Product').countDocuments({
        status: 'active'
      });
      
      const activeBoostedProducts = await Boost.countDocuments({
        status: 'active',
        endDate: { $gt: new Date() }
      });

      // Revenue concentration (top 20% of users)
      const userRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: dateFilter,
            user: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$user',
            total: { $sum: '$amount' }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]);

      const totalUserRevenue = userRevenue.reduce((sum, user) => sum + user.total, 0);
      const top20PercentCount = Math.ceil(userRevenue.length * 0.2);
      const top20PercentRevenue = userRevenue
        .slice(0, top20PercentCount)
        .reduce((sum, user) => sum + user.total, 0);
      
      const concentrationRatio = totalUserRevenue > 0 ? 
        (top20PercentRevenue / totalUserRevenue) * 100 : 0;

      return {
        reportPeriod: {
          start: dateFilter.$gte,
          end: dateFilter.$lte,
          timeframe
        },
        summary: {
          totalRevenue: currentRevenue,
          totalTransactions: allRevenue[0]?.transactionCount || 0,
          averageTransactionValue: allRevenue[0]?.transactionCount > 0 ? 
            currentRevenue / allRevenue[0]?.transactionCount : 0,
          growthRate: parseFloat(growthRate.toFixed(2)),
          previousPeriodRevenue
        },
        breakdown: {
          bySource: breakdownBySource,
          byMethod: await this.calculateTransactionFees(timeframe)
        },
        projections: {
          dailyAverage: parseFloat(dailyAverage.toFixed(2)),
          monthlyProjection: parseFloat(monthlyProjection.toFixed(2)),
          yearlyProjection: parseFloat(yearlyProjection.toFixed(2))
        },
        platformHealth: {
          activeSellers,
          activeBuyers,
          totalProducts,
          activeBoostedProducts,
          boostRevenue: await this.calculateBoostRevenue(timeframe),
          subscriptionRevenue: await this.calculateSubscriptionRevenue(timeframe),
          affiliateRevenue: await this.calculateAffiliateRevenue(timeframe)
        },
        analytics: {
          revenueConcentration: parseFloat(concentrationRatio.toFixed(2)),
          topRevenueSources: breakdownBySource.slice(0, 5),
          revenueTrend: await this.getRevenueTrend(dateFilter),
          peakHours: await this.getPeakRevenueHours(dateFilter)
        },
        generatedAt: new Date(),
        generatedBy: adminUser.email
      };
    } catch (error) {
      console.error('Revenue report generation error:', error);
      throw error;
    }
  }

  // ==================== REVENUE TREND ANALYSIS ====================
  
  /**
   * Get revenue trend data
   */
  async getRevenueTrend(dateFilter) {
    try {
      const trendData = await Revenue.aggregate([
        {
          $match: {
            recordedAt: dateFilter
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$recordedAt' }
            },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        },
        {
          $project: {
            date: '$_id',
            revenue: 1,
            transactions: 1,
            average: { $divide: ['$revenue', '$transactions'] }
          }
        }
      ]);

      return trendData;
    } catch (error) {
      console.error('Revenue trend analysis error:', error);
      return [];
    }
  }

  // ==================== PEAK REVENUE HOURS ====================
  
  /**
   * Get peak revenue hours
   */
  async getPeakRevenueHours(dateFilter) {
    try {
      const hourlyRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: dateFilter
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$recordedAt' }
            },
            revenue: { $sum: '$amount' },
            transactions: { $sum: 1 }
          }
        },
        {
          $sort: { revenue: -1 }
        },
        {
          $project: {
            hour: '$_id.hour',
            revenue: 1,
            transactions: 1,
            _id: 0
          }
        }
      ]);

      return hourlyRevenue;
    } catch (error) {
      console.error('Peak hours analysis error:', error);
      return [];
    }
  }

  // ==================== REVENUE FORECASTING ====================
  
  /**
   * Generate revenue forecast
   */
  async generateRevenueForecast(adminUser, periods = 12) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      // Get historical data (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const historicalData = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$recordedAt' },
              month: { $month: '$recordedAt' }
            },
            revenue: { $sum: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Simple moving average forecast
      const monthlyRevenues = historicalData.map(item => item.revenue);
      const windowSize = Math.min(3, monthlyRevenues.length);
      
      let forecast = [];
      for (let i = 0; i < periods; i++) {
        const start = Math.max(0, monthlyRevenues.length - windowSize + i);
        const end = monthlyRevenues.length + i;
        
        const window = monthlyRevenues.slice(start, end);
        const forecastValue = window.reduce((a, b) => a + b, 0) / window.length;
        
        // Apply growth factor (5% month-over-month growth assumption)
        const growthFactor = 1.05;
        const finalValue = forecastValue * Math.pow(growthFactor, i + 1);
        
        forecast.push({
          period: i + 1,
          month: new Date(new Date().setMonth(new Date().getMonth() + i + 1)),
          forecastedRevenue: parseFloat(finalValue.toFixed(2)),
          confidence: Math.max(0.7, 1 - (i * 0.05)) // Confidence decreases over time
        });
      }

      // Calculate forecast accuracy based on historical data
      let accuracy = 0;
      if (monthlyRevenues.length >= 3) {
        // Simple accuracy calculation (for demo purposes)
        const lastThree = monthlyRevenues.slice(-3);
        const avg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;
        const variance = lastThree.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lastThree.length;
        accuracy = Math.max(0.75, 1 - (variance / (avg * avg)));
      }

      return {
        historicalData,
        forecast,
        accuracy: parseFloat(accuracy.toFixed(2)),
        assumptions: {
          growthRate: '5% month-over-month',
          seasonality: 'Not accounted for',
          marketConditions: 'Stable',
          confidenceThreshold: '70%'
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Revenue forecasting error:', error);
      throw error;
    }
  }

  // ==================== REVENUE ALERTS ====================
  
  /**
   * Check for revenue anomalies and generate alerts
   */
  async checkRevenueAlerts(adminUser) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Today's revenue
      const todayRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Yesterday's revenue
      const yesterdayRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Last week same day revenue
      const lastWeekRevenue = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { 
              $gte: lastWeek, 
              $lt: new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const todayTotal = todayRevenue[0]?.total || 0;
      const yesterdayTotal = yesterdayRevenue[0]?.total || 0;
      const lastWeekTotal = lastWeekRevenue[0]?.total || 0;

      const alerts = [];

      // Check for significant drops
      if (yesterdayTotal > 0 && todayTotal < (yesterdayTotal * 0.5)) {
        alerts.push({
          type: 'CRITICAL',
          code: 'REVENUE_DROP_50',
          message: `Revenue dropped more than 50% compared to yesterday. Today: $${todayTotal}, Yesterday: $${yesterdayTotal}`,
          severity: 'high',
          timestamp: new Date()
        });
      }

      // Check for week-over-week drop
      if (lastWeekTotal > 0 && todayTotal < (lastWeekTotal * 0.7)) {
        alerts.push({
          type: 'WARNING',
          code: 'WEEKLY_DROP_30',
          message: `Revenue dropped more than 30% compared to last week same day. Today: $${todayTotal}, Last Week: $${lastWeekTotal}`,
          severity: 'medium',
          timestamp: new Date()
        });
      }

      // Check for no revenue
      const hoursSinceMidnight = (new Date() - today) / (1000 * 60 * 60);
      if (hoursSinceMidnight > 4 && todayTotal === 0) {
        alerts.push({
          type: 'CRITICAL',
          code: 'NO_REVENUE_4H',
          message: 'No revenue recorded in the last 4 hours',
          severity: 'high',
          timestamp: new Date()
        });
      }

      // Check payment method distribution anomalies
      const paymentMethods = await Revenue.aggregate([
        {
          $match: {
            recordedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalTodayTransactions = paymentMethods.reduce((sum, method) => sum + method.count, 0);
      
      paymentMethods.forEach(method => {
        const percentage = (method.count / totalTodayTransactions) * 100;
        if (percentage > 80) {
          alerts.push({
            type: 'INFO',
            code: 'PAYMENT_METHOD_DOMINANCE',
            message: `${method._id} accounts for ${percentage.toFixed(1)}% of today's transactions`,
            severity: 'low',
            timestamp: new Date()
          });
        }
      });

      return {
        todayRevenue: todayTotal,
        yesterdayRevenue: yesterdayTotal,
        lastWeekRevenue: lastWeekTotal,
        alerts,
        alertCount: alerts.length,
        checkedAt: new Date()
      };
    } catch (error) {
      console.error('Revenue alerts check error:', error);
      throw error;
    }
  }
}

module.exports = new RevenueService();