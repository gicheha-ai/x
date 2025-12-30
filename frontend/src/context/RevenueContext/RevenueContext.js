import React, { createContext, useContext, useState } from 'react';
import { revenueService } from '../../services';

const RevenueContext = createContext({});

export const useRevenue = () => useContext(RevenueContext);

export const RevenueProvider = ({ children }) => {
  const [revenueStreams, setRevenueStreams] = useState({
    boostSales: 0,
    transactionFees: 0,
    affiliateCommissions: 0,
    subscriptions: 0,
    paymentFees: 0,
    premiumFeatures: 0
  });
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getRevenueSummary = async (period = 'monthly') => {
    try {
      setLoading(true);
      const response = await revenueService.getSummary(period);
      
      if (response.success) {
        setRevenueStreams(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      return { success: false, error: 'Failed to fetch revenue summary' };
    } finally {
      setLoading(false);
    }
  };

  const getTransactions = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await revenueService.getTransactions(filters);
      
      if (response.success) {
        setTransactions(response.data);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      return { success: false, error: 'Failed to fetch transactions' };
    } finally {
      setLoading(false);
    }
  };

  const generateRevenueReport = async (startDate, endDate, format = 'pdf') => {
    try {
      const response = await revenueService.generateReport(startDate, endDate, format);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to generate report' };
    }
  };

  const calculateCommission = (amount, commissionRate = 0.08) => {
    // 8% transaction fee for regular sellers
    return amount * commissionRate;
  };

  const calculateAffiliateCommission = (amount, rate = 0.20) => {
    // 20% affiliate commission
    return amount * rate;
  };

  const value = {
    revenueStreams,
    transactions,
    loading,
    getRevenueSummary,
    getTransactions,
    generateRevenueReport,
    calculateCommission,
    calculateAffiliateCommission
  };

  return (
    <RevenueContext.Provider value={value}>
      {children}
    </RevenueContext.Provider>
  );
};
