import { revenueApi } from './api';

export const revenueService = {
  getRevenueSummary: async () => {
    try {
      const response = await revenueApi.getRevenueSummary();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch revenue summary' };
    }
  },

  getAnalytics: async (period = 'daily') => {
    try {
      const response = await revenueApi.getAnalytics(period);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch analytics' };
    }
  },

  getTransactions: async (filters = {}) => {
    try {
      const response = await revenueApi.getTransactions(filters);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch transactions' };
    }
  },

  generateReport: async (startDate, endDate, format = 'pdf') => {
    try {
      const response = await revenueApi.generateReport(startDate, endDate, format);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to generate report' };
    }
  },

  // Revenue calculation helpers
  calculateDailyRevenue: (transactions) => {
    const today = new Date().toDateString();
    return transactions
      .filter(t => new Date(t.createdAt).toDateString() === today)
      .reduce((sum, t) => sum + t.amount, 0);
  },

  calculateMonthlyRevenue: (transactions, month, year) => {
    return transactions
      .filter(t => {
        const date = new Date(t.createdAt);
        return date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  },

  getRevenueBySource: (transactions) => {
    const sources = {
      boost: 0,
      commission: 0,
      subscription: 0,
      affiliate: 0,
      other: 0
    };
    
    transactions.forEach(t => {
      if (sources[t.source]) {
        sources[t.source] += t.amount;
      } else {
        sources.other += t.amount;
      }
    });
    
    return sources;
  },

  getRevenueByPaymentMethod: (transactions) => {
    const methods = {
      paypal: 0,
      stripe: 0,
      bank: 0,
      mobile: 0,
      other: 0
    };
    
    transactions.forEach(t => {
      if (methods[t.paymentMethod]) {
        methods[t.paymentMethod] += t.amount;
      } else {
        methods.other += t.amount;
      }
    });
    
    return methods;
  },

  // Chart data formatting
  formatChartData: (transactions, period = 'daily') => {
    const now = new Date();
    let labels = [];
    let data = [];
    
    switch (period) {
      case 'daily':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
          
          const dayRevenue = transactions
            .filter(t => new Date(t.createdAt).toDateString() === date.toDateString())
            .reduce((sum, t) => sum + t.amount, 0);
          data.push(dayRevenue);
        }
        break;
        
      case 'weekly':
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - (i + 1) * 7);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          
          labels.push(`Week ${i + 1}`);
          
          const weekRevenue = transactions
            .filter(t => {
              const date = new Date(t.createdAt);
              return date >= startDate && date <= endDate;
            })
            .reduce((sum, t) => sum + t.amount, 0);
          data.push(weekRevenue);
        }
        break;
        
      case 'monthly':
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
          
          const monthRevenue = transactions
            .filter(t => {
              const tDate = new Date(t.createdAt);
              return tDate.getMonth() === date.getMonth() && 
                     tDate.getFullYear() === date.getFullYear();
            })
            .reduce((sum, t) => sum + t.amount, 0);
          data.push(monthRevenue);
        }
        break;
    }
    
    return { labels, data };
  },

  // Revenue growth calculation
  calculateGrowth: (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Platform statistics
  getPlatformStats: (transactions, users, products) => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const todayRevenue = revenueService.calculateDailyRevenue(transactions);
    const activeUsers = users.filter(u => u.isActive).length;
    const activeProducts = products.filter(p => p.isActive).length;
    
    return {
      totalRevenue,
      todayRevenue,
      activeUsers,
      activeProducts,
      avgTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0
    };
  },

  // Export revenue data
  exportRevenueData: (data, format = 'csv') => {
    let exportContent = '';
    
    if (format === 'csv') {
      // CSV header
      exportContent = 'Date,Amount,Source,Payment Method,Description\n';
      
      // CSV rows
      data.forEach(item => {
        exportContent += `"${new Date(item.createdAt).toLocaleDateString()}","${item.amount}","${item.source}","${item.paymentMethod}","${item.description || ''}"\n`;
      });
    } else if (format === 'json') {
      exportContent = JSON.stringify(data, null, 2);
    }
    
    return exportContent;
  }
};
