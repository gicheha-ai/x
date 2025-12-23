import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { revenueService, linkService } from '../../services';

const SuperAdminContext = createContext({});

export const useSuperAdmin = () => useContext(SuperAdminContext);

export const SuperAdminProvider = ({ children }) => {
  const { user } = useAuth();
  const [revenueData, setRevenueData] = useState(null);
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revenueStats, setRevenueStats] = useState({
    totalPlatformRevenue: 0,
    todayRevenue: 0,
    activeBoostedProducts: 0,
    affiliateCommissionsGenerated: 0,
    subscriptionRevenue: 0
  });

  const isSuperAdmin = () => {
    return user?.email === 'gichehalawrence@gmail.com';
  };

  const fetchRevenueData = async () => {
    if (!isSuperAdmin()) return;
    
    try {
      setLoading(true);
      const response = await revenueService.getRevenueSummary();
      
      if (response.success) {
        setRevenueData(response.data);
        setRevenueStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrackingLink = async () => {
    if (!isSuperAdmin()) return null;
    
    try {
      const response = await linkService.generateTrackingLink();
      
      if (response.success) {
        const newLink = {
          link: response.link,
          linkId: response.linkId,
          expiresAt: response.expiresAt,
          generatedAt: new Date().toISOString(),
          clicks: 0,
          conversions: 0,
          revenue: 0
        };
        
        setTrackingLinks(prev => [newLink, ...prev]);
        return response;
      }
    } catch (error) {
      console.error('Error generating tracking link:', error);
      return null;
    }
  };

  const fetchTrackingLinks = async () => {
    if (!isSuperAdmin()) return;
    
    try {
      const response = await linkService.getTrackingLinks();
      
      if (response.success) {
        setTrackingLinks(response.data);
      }
    } catch (error) {
      console.error('Error fetching tracking links:', error);
    }
  };

  const getPaymentMobile = () => {
    return '254105441783'; // Hardcoded as per requirements
  };

  const getRevenueAnalytics = async (period = 'daily') => {
    if (!isSuperAdmin()) return null;
    
    try {
      const response = await revenueService.getAnalytics(period);
      return response;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  };

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchRevenueData();
      fetchTrackingLinks();
      
      // Auto-refresh every 5 minutes
      const interval = setInterval(fetchRevenueData, 300000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin()]);

  const value = {
    isSuperAdmin: isSuperAdmin(),
    revenueData,
    revenueStats,
    trackingLinks,
    loading,
    fetchRevenueData,
    generateTrackingLink,
    fetchTrackingLinks,
    getPaymentMobile,
    getRevenueAnalytics
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
};