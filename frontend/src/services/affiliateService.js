import { affiliateApi } from './api';

export const affiliateService = {
  joinProgram: async () => {
    try {
      const response = await affiliateApi.joinProgram();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to join affiliate program' };
    }
  },

  getDashboard: async () => {
    try {
      const response = await affiliateApi.getDashboard();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch affiliate dashboard' };
    }
  },

  getCommissions: async () => {
    try {
      const response = await affiliateApi.getCommissions();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch commissions' };
    }
  },

  generateAffiliateLink: async () => {
    try {
      const response = await affiliateApi.generateAffiliateLink();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to generate affiliate link' };
    }
  },

  withdrawEarnings: async (amount) => {
    try {
      const response = await affiliateApi.withdrawEarnings(amount);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to withdraw earnings' };
    }
  },

  getReferrals: async () => {
    try {
      const response = await affiliateApi.getReferrals();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch referrals' };
    }
  },

  // Affiliate calculation utilities
  calculateCommission: (saleAmount, commissionRate = 0.20) => {
    return saleAmount * commissionRate;
  },

  calculateTieredCommission: (totalSales) => {
    let rate = 0.20; // Base 20%
    
    if (totalSales >= 10000) rate = 0.25; // 25% for top tier
    else if (totalSales >= 5000) rate = 0.22; // 22% for mid tier
    else if (totalSales >= 1000) rate = 0.21; // 21% for entry tier
    
    return {
      rate: rate * 100,
      tier: totalSales >= 10000 ? 'platinum' : 
            totalSales >= 5000 ? 'gold' : 
            totalSales >= 1000 ? 'silver' : 'bronze'
    };
  },

  // Affiliate link generation
  generateAffiliateCode: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AFF-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  formatAffiliateLink: (baseUrl, affiliateCode) => {
    return `${baseUrl}?ref=${affiliateCode}`;
  },

  // Performance metrics
  calculateAffiliateMetrics: (data) => {
    const clicks = data.clicks || 0;
    const conversions = data.conversions || 0;
    const sales = data.sales || 0;
    const commissions = data.commissions || 0;
    
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const averageOrderValue = conversions > 0 ? sales / conversions : 0;
    const earningsPerClick = clicks > 0 ? commissions / clicks : 0;
    const earningsPerConversion = conversions > 0 ? commissions / conversions : 0;
    
    return {
      clicks,
      conversions,
      sales,
      commissions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      earningsPerClick: Math.round(earningsPerClick * 100) / 100,
      earningsPerConversion: Math.round(earningsPerConversion * 100) / 100
    };
  },

  // Withdrawal validation
  validateWithdrawal: (amount, balance, pendingCommissions) => {
    const errors = [];
    const availableBalance = balance - pendingCommissions;
    
    if (amount < 50) {
      errors.push('Minimum withdrawal amount is $50');
    }
    
    if (amount > availableBalance) {
      errors.push(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
    }
    
    if (amount <= 0) {
      errors.push('Withdrawal amount must be greater than 0');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      availableBalance,
      canWithdraw: amount >= 50 && amount <= availableBalance
    };
  },

  // Commission tracking
  trackAffiliateConversion: async (affiliateCode, conversionData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/affiliate/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          affiliateCode,
          ...conversionData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ipAddress: conversionData.ipAddress || 'unknown'
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking affiliate conversion:', error);
      return { success: false, message: 'Tracking failed' };
    }
  },

  // Affiliate levels and rewards
  getAffiliateLevel: (totalSales, totalReferrals) => {
    if (totalSales >= 50000 && totalReferrals >= 50) return 'Ambassador';
    if (totalSales >= 20000 && totalReferrals >= 20) return 'Partner';
    if (totalSales >= 5000 && totalReferrals >= 10) return 'Pro';
    if (totalSales >= 1000) return 'Affiliate';
    return 'Starter';
  },

  getLevelBenefits: (level) => {
    const benefits = {
      'Starter': {
        commission: '20%',
        features: ['Basic dashboard', 'Link generation', 'Performance tracking'],
        minPayout: 50
      },
      'Affiliate': {
        commission: '21%',
        features: ['All Starter features', 'Advanced analytics', 'Dedicated support'],
        minPayout: 50
      },
      'Pro': {
        commission: '22%',
        features: ['All Affiliate features', 'API access', 'Custom landing pages'],
        minPayout: 100
      },
      'Partner': {
        commission: '23%',
        features: ['All Pro features', 'Priority support', 'Exclusive promotions'],
        minPayout: 250
      },
      'Ambassador': {
        commission: '25%',
        features: ['All Partner features', 'Revenue share', 'Merchandise', 'Event invitations'],
        minPayout: 500
      }
    };
    
    return benefits[level] || benefits['Starter'];
  },

  // Referral tracking
  trackReferralSignup: async (affiliateCode, userData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/affiliate/referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          affiliateCode,
          referredUser: userData,
          timestamp: new Date().toISOString(),
          source: 'website'
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking referral:', error);
      return { success: false, message: 'Referral tracking failed' };
    }
  },

  // Payout methods
  getPayoutMethods: () => {
    return [
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '👛',
        processingTime: '1-2 business days',
        minAmount: 50,
        fee: 1.5
      },
      {
        id: 'bank',
        name: 'Bank Transfer',
        icon: '🏦',
        processingTime: '3-5 business days',
        minAmount: 100,
        fee: 2.0
      },
      {
        id: 'airtel',
        name: 'Airtel Money',
        icon: '📱',
        processingTime: 'Instant',
        minAmount: 10,
        fee: 1.0,
        available: ['KE', 'UG', 'TZ', 'RW'] // Available in these countries
      }
    ];
  },

  // Performance reports
  generateAffiliateReport: (data, period = 'monthly') => {
    const report = {
      period,
      generated: new Date().toISOString(),
      summary: affiliateService.calculateAffiliateMetrics(data),
      detailedStats: data.detailedStats || [],
      topProducts: data.topProducts || [],
      trends: data.trends || []
    };
    
    return report;
  }
};
