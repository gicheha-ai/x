import { boostApi } from './api';

export const boostService = {
  boostProduct: async (productId, boostData) => {
    try {
      const response = await boostApi.boostProduct(productId, boostData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to boost product' };
    }
  },

  getBoostPlans: async () => {
    try {
      const response = await boostApi.getBoostPlans();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch boost plans' };
    }
  },

  getBoostedProducts: async () => {
    try {
      const response = await boostApi.getBoostedProducts();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch boosted products' };
    }
  },

  cancelBoost: async (boostId) => {
    try {
      const response = await boostApi.cancelBoost(boostId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to cancel boost' };
    }
  },

  getBoostHistory: async () => {
    try {
      const response = await boostApi.getBoostHistory();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch boost history' };
    }
  },

  // Boost calculation and utilities
  calculateBoostCost: (plan, duration = 1) => {
    const plans = {
      'daily': { base: 10, discount: 0 },
      'weekly': { base: 50, discount: 0.1 }, // 10% discount compared to 7 daily
      'monthly': { base: 150, discount: 0.29 }, // ~29% discount
      'featured': { base: 200, discount: 0 } // Premium featured spot
    };
    
    const selectedPlan = plans[plan] || plans['daily'];
    let total = selectedPlan.base * duration;
    
    // Additional discount for bulk purchases
    if (duration >= 3) {
      total *= 0.9; // 10% extra discount
    }
    if (duration >= 6) {
      total *= 0.85; // 15% extra discount
    }
    
    return {
      basePrice: selectedPlan.base,
      planDiscount: selectedPlan.discount * 100,
      durationDiscount: duration >= 3 ? (duration >= 6 ? 15 : 10) : 0,
      total: Math.round(total * 100) / 100,
      perDay: Math.round((total / duration) * 100) / 100
    };
  },

  getBoostPlanDetails: (plan) => {
    const details = {
      'daily': {
        name: 'Daily Boost',
        description: 'Boost your product for 24 hours',
        duration: 1,
        unit: 'day',
        features: [
          'Top placement in category',
          'Boost badge on product',
          'Increased visibility',
          '24-hour duration'
        ],
        bestFor: 'Quick promotions or new product launches'
      },
      'weekly': {
        name: 'Weekly Boost',
        description: 'Boost your product for 7 days',
        duration: 7,
        unit: 'week',
        features: [
          'All Daily Boost features',
          'Featured in weekly promotions',
          'Email newsletter inclusion',
          '7-day duration',
          '10% discount vs daily rate'
        ],
        bestFor: 'Product launches or weekly sales'
      },
      'monthly': {
        name: 'Monthly Boost',
        description: 'Boost your product for 30 days',
        duration: 30,
        unit: 'month',
        features: [
          'All Weekly Boost features',
          'Homepage featured section',
          'Priority support',
          '30-day duration',
          '29% discount vs daily rate'
        ],
        bestFor: 'Established products or seasonal items'
      },
      'featured': {
        name: 'Featured Spot',
        description: 'Premium featured placement',
        duration: 7,
        unit: 'week',
        features: [
          'All Monthly Boost features',
          'Homepage hero banner',
          'Social media promotion',
          'Dedicated email blast',
          'Highest visibility'
        ],
        bestFor: 'Major promotions or brand awareness'
      }
    };
    
    return details[plan] || details['daily'];
  },

  validateBoostData: (boostData) => {
    const errors = [];
    
    if (!boostData.plan) {
      errors.push('Boost plan is required');
    }
    
    if (!boostData.duration || boostData.duration < 1) {
      errors.push('Duration must be at least 1');
    }
    
    if (!boostData.productId) {
      errors.push('Product ID is required');
    }
    
    if (boostData.duration > 12) {
      errors.push('Maximum duration is 12 units');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  calculateBoostEndDate: (startDate, plan, duration) => {
    const start = new Date(startDate);
    const planDetails = boostService.getBoostPlanDetails(plan);
    const totalDays = planDetails.duration * duration;
    
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + totalDays);
    
    return {
      startDate: start,
      endDate,
      totalDays,
      formatted: endDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  },

  getBoostStatus: (boostData) => {
    if (!boostData) return 'inactive';
    
    const now = new Date();
    const start = new Date(boostData.startDate);
    const end = new Date(boostData.endDate);
    
    if (now < start) return 'scheduled';
    if (now >= start && now <= end) return 'active';
    if (now > end) return 'expired';
    
    return 'inactive';
  },

  getBoostPerformance: (productStats, boostData) => {
    if (!boostData || boostData.status !== 'active') {
      return { boostActive: false };
    }
    
    const viewsDuringBoost = productStats.viewsDuringBoost || 0;
    const salesDuringBoost = productStats.salesDuringBoost || 0;
    const clicksDuringBoost = productStats.clicksDuringBoost || 0;
    
    const viewIncrease = productStats.avgDailyViews > 0 
      ? ((viewsDuringBoost - productStats.avgDailyViews) / productStats.avgDailyViews) * 100 
      : 100;
    
    const conversionRate = viewsDuringBoost > 0 
      ? (salesDuringBoost / viewsDuringBoost) * 100 
      : 0;
    
    const clickThroughRate = productStats.totalImpressions > 0 
      ? (clicksDuringBoost / productStats.totalImpressions) * 100 
      : 0;
    
    return {
      boostActive: true,
      viewIncrease,
      conversionRate,
      clickThroughRate,
      salesDuringBoost,
      viewsDuringBoost,
      clicksDuringBoost,
      roi: boostData.cost > 0 
        ? ((salesDuringBoost * 0.08) / boostData.cost) * 100 // 8% commission ROI
        : 0
    };
  },

  // Auto-renewal utilities
  calculateAutoRenewalSavings: (plan, duration) => {
    const costWithoutRenewal = boostService.calculateBoostCost(plan, duration).total;
    const costWithRenewal = costWithoutRenewal * 0.9; // 10% discount for auto-renewal
    
    return {
      withoutRenewal: costWithoutRenewal,
      withRenewal: costWithRenewal,
      savings: costWithoutRenewal - costWithRenewal,
      savingsPercent: 10
    };
  },

  // Bulk boost discounts
  getBulkBoostDiscount: (count) => {
    if (count >= 10) return 20;
    if (count >= 5) return 15;
    if (count >= 3) return 10;
    return 0;
  },

  // Boost scheduling
  scheduleBoost: (productId, boostData, scheduleDate) => {
    return {
      productId,
      boostData,
      scheduledFor: new Date(scheduleDate),
      status: 'scheduled',
      createdAt: new Date(),
      scheduleId: `SCH-${Date.now().toString().slice(-8)}`
    };
  }
};
