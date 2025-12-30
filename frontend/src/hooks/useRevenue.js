import { useContext } from 'react';
import { RevenueContext } from '../context/RevenueContext';
import { revenueService } from '../services';

/**
 * Custom hook for revenue functionality
 */
export const useRevenue = () => {
  const context = useContext(RevenueContext);
  
  if (!context) {
    throw new Error('useRevenue must be used within a RevenueProvider');
  }
  
  return context;
};

/**
 * Hook for super admin revenue dashboard
 */
export const useSuperAdminRevenue = () => {
  const { revenueData, revenueStats, loading, fetchRevenueData } = useRevenue();
  const [timeRange, setTimeRange] = useState('today');
  const [detailedStats, setDetailedStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  
  const loadDetailedStats = async (range = timeRange) => {
    try {
      const result = await revenueService.getAnalytics(range);
      
      if (result.success) {
        setDetailedStats(result.data);
        
        // Format chart data
        if (result.data.transactions) {
          const formatted = revenueService.formatChartData(
            result.data.transactions,
            range
          );
          setChartData(formatted);
        }
      }
    } catch (error) {
      console.error('Failed to load detailed stats:', error);
    }
  };
  
  const changeTimeRange = (newRange) => {
    setTimeRange(newRange);
    loadDetailedStats(newRange);
  };
  
  const getRevenueBreakdown = () => {
    if (!detailedStats) return null;
    
    const sources = revenueService.getRevenueBySource(detailedStats.transactions || []);
    const methods = revenueService.getRevenueByPaymentMethod(detailedStats.transactions || []);
    
    return {
      bySource: Object.entries(sources).map(([source, amount]) => ({
        source,
        amount,
        percentage: (amount / detailedStats.totalRevenue) * 100
      })),
      byMethod: Object.entries(methods).map(([method, amount]) => ({
        method,
        amount,
        percentage: (amount / detailedStats.totalRevenue) * 100
      }))
    };
  };
  
  const getTopPerformers = () => {
    if (!detailedStats) return { products: [], sellers: [], affiliates: [] };
    
    return {
      products: detailedStats.topProducts || [],
      sellers: detailedStats.topSellers || [],
      affiliates: detailedStats.topAffiliates || []
    };
  };
  
  const generateReport = async (startDate, endDate, format = 'pdf') => {
    try {
      const result = await revenueService.generateReport(startDate, endDate, format);
      
      if (result.success) {
        return {
          success: true,
          reportUrl: result.data.url,
          message: 'Report generated successfully'
        };
      }
      
      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate report'
      };
    }
  };
  
  useEffect(() => {
    if (revenueData) {
      loadDetailedStats();
    }
  }, [revenueData]);
  
  return {
    revenueData,
    revenueStats,
    loading,
    timeRange,
    detailedStats,
    chartData,
    changeTimeRange,
    getRevenueBreakdown,
    getTopPerformers,
    generateReport,
    refresh: fetchRevenueData
  };
};

/**
 * Hook for seller revenue tracking
 */
export const useSellerRevenue = () => {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadSellerRevenue = async (timePeriod = 'monthly') => {
    try {
      setLoading(true);
      setError(null);
      
      // This would call seller-specific revenue API
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRevenue = {
        totalRevenue: 12500,
        netRevenue: 11500,
        transactionFees: 1000,
        totalSales: 150,
        averageOrderValue: 83.33,
        todayRevenue: 480,
        todaySales: 6,
        topProducts: [
          { name: 'Premium Headphones', sales: 45, revenue: 4500 },
          { name: 'Smart Watch', sales: 32, revenue: 3200 },
          { name: 'Wireless Earbuds', sales: 28, revenue: 2800 }
        ],
        revenueByDay: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
          revenue: Math.floor(Math.random() * 500) + 100,
          sales: Math.floor(Math.random() * 10) + 1
        })),
        commissionPaid: 1000,
        affiliateCommissions: 250,
        boostExpenses: 300,
        netProfit: 8950
      };
      
      setRevenue(mockRevenue);
    } catch (err) {
      setError('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };
  
  const calculateCommission = (amount) => {
    // 8% transaction fee for sellers
    return amount * 0.08;
  };
  
  const calculateNetRevenue = (grossRevenue, expenses = 0) => {
    const commission = calculateCommission(grossRevenue);
    return grossRevenue - commission - expenses;
  };
  
  const getRevenueProjection = (currentRevenue, growthRate = 0.05) => {
    const projection = [];
    let current = currentRevenue;
    
    for (let i = 1; i <= 12; i++) {
      current = current * (1 + growthRate);
      projection.push({
        month: i,
        revenue: Math.round(current)
      });
    }
    
    return projection;
  };
  
  useEffect(() => {
    loadSellerRevenue();
  }, []);
  
  return {
    revenue,
    loading,
    error,
    calculateCommission,
    calculateNetRevenue,
    getRevenueProjection,
    refresh: () => loadSellerRevenue()
  };
};

/**
 * Hook for affiliate revenue tracking
 */
export const useAffiliateRevenue = () => {
  const [affiliateRevenue, setAffiliateRevenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadAffiliateRevenue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would call affiliate-specific revenue API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRevenue = {
        totalCommissions: 2150,
        availableBalance: 1650,
        pendingCommissions: 500,
        totalReferrals: 45,
        conversionRate: 22.5,
        averageCommission: 47.78,
        commissionsByMonth: Array.from({ length: 6 }, (_, i) => ({
          month: new Date(Date.now() - (5 - i) * 30 * 24 * 60 * 60 * 1000),
          commissions: Math.floor(Math.random() * 500) + 200,
          referrals: Math.floor(Math.random() * 15) + 5
        })),
        topReferrals: [
          { product: 'Smartphone', commissions: 450, referrals: 8 },
          { product: 'Laptop', commissions: 380, referrals: 5 },
          { product: 'Tablet', commissions: 290, referrals: 6 }
        ],
        affiliateLevel: 'Pro',
        commissionRate: 0.22,
        nextLevel: {
          name: 'Partner',
          requiredSales: 20000,
          currentSales: 12500,
          commissionRate: 0.23,
          progress: 62.5
        }
      };
      
      setAffiliateRevenue(mockRevenue);
    } catch (err) {
      setError('Failed to load affiliate revenue');
    } finally {
      setLoading(false);
    }
  };
  
  const calculateCommission = (saleAmount, commissionRate = 0.20) => {
    return saleAmount * commissionRate;
  };
  
  const calculateTieredCommission = (totalSales) => {
    let rate = 0.20; // Base 20%
    
    if (totalSales >= 50000) rate = 0.25;
    else if (totalSales >= 20000) rate = 0.23;
    else if (totalSales >= 10000) rate = 0.22;
    else if (totalSales >= 5000) rate = 0.21;
    
    return {
      rate,
      tier: totalSales >= 50000 ? 'Ambassador' :
            totalSales >= 20000 ? 'Partner' :
            totalSales >= 10000 ? 'Pro' :
            totalSales >= 5000 ? 'Affiliate' : 'Starter'
    };
  };
  
  const canWithdraw = (amount, balance, pending) => {
    const available = balance - pending;
    return amount >= 50 && amount <= available;
  };
  
  useEffect(() => {
    loadAffiliateRevenue();
  }, []);
  
  return {
    affiliateRevenue,
    loading,
    error,
    calculateCommission,
    calculateTieredCommission,
    canWithdraw,
    refresh: loadAffiliateRevenue
  };
};

/**
 * Hook for transaction history
 */
export const useTransactionHistory = (filters = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 20
  });
  
  const loadTransactions = async (newFilters = filters, page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await revenueService.getTransactions({
        ...newFilters,
        page,
        limit: 20
      });
      
      if (result.success) {
        setTransactions(result.data.transactions || []);
        setPagination({
          page: result.data.page || 1,
          total: result.data.total || 0,
          totalPages: result.data.totalPages || 1,
          limit: result.data.limit || 20
        });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };
  
  const filterTransactions = (newFilters) => {
    loadTransactions(newFilters, 1);
  };
  
  const nextPage = () => {
    if (pagination.page < pagination.totalPages) {
      loadTransactions(filters, pagination.page + 1);
    }
  };
  
  const prevPage = () => {
    if (pagination.page > 1) {
      loadTransactions(filters, pagination.page - 1);
    }
  };
  
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadTransactions(filters, page);
    }
  };
  
  const exportTransactions = (format = 'csv') => {
    const data = revenueService.exportRevenueData(transactions, format);
    
    if (format === 'csv') {
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'json') {
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    }
  };
  
  const getTransactionSummary = () => {
    const summary = {
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      totalCount: transactions.length,
      bySource: {},
      byMethod: {},
      byStatus: {}
    };
    
    transactions.forEach(t => {
      summary.bySource[t.source] = (summary.bySource[t.source] || 0) + t.amount;
      summary.byMethod[t.paymentMethod] = (summary.byMethod[t.paymentMethod] || 0) + t.amount;
      summary.byStatus[t.status] = (summary.byStatus[t.status] || 0) + 1;
    });
    
    return summary;
  };
  
  useEffect(() => {
    loadTransactions();
  }, []);
  
  return {
    transactions,
    loading,
    error,
    pagination,
    loadTransactions,
    filterTransactions,
    nextPage,
    prevPage,
    goToPage,
    exportTransactions,
    getTransactionSummary,
    refresh: () => loadTransactions(filters, pagination.page)
  };
};

// Import useState and useEffect
import { useState, useEffect } from 'react';
