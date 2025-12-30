import { useContext } from 'react';
import { SuperAdminContext } from '../context/SuperAdminContext';
import { linkService } from '../services';

/**
 * Custom hook for link generation functionality (Super Admin only)
 */
export const useLinkGenerator = () => {
  const context = useContext(SuperAdminContext);
  
  if (!context) {
    throw new Error('useLinkGenerator must be used within a SuperAdminProvider');
  }
  
  return context;
};

/**
 * Hook for generating and managing tracking links
 */
export const useTrackingLinks = () => {
  const { trackingLinks, generateTrackingLink, fetchTrackingLinks, loading } = useLinkGenerator();
  const [activeLinks, setActiveLinks] = useState([]);
  const [expiredLinks, setExpiredLinks] = useState([]);
  const [stats, setStats] = useState(null);
  
  const generateNewLink = async () => {
    try {
      const result = await generateTrackingLink();
      
      if (result) {
        return {
          success: true,
          link: result.link,
          linkId: result.linkId,
          expiresAt: result.expiresAt,
          message: 'Tracking link generated successfully'
        };
      }
      
      return {
        success: false,
        error: 'Failed to generate link'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate tracking link'
      };
    }
  };
  
  const categorizeLinks = () => {
    const now = new Date();
    
    const active = trackingLinks.filter(link => 
      new Date(link.expiresAt) > now
    );
    
    const expired = trackingLinks.filter(link => 
      new Date(link.expiresAt) <= now
    );
    
    const highPerforming = active.filter(link => {
      const performance = linkService.getLinkPerformance(
        link.clicks || 0,
        link.conversions || 0,
        link.revenue || 0
      );
      return performance.conversionRate > 10;
    });
    
    const lowPerforming = active.filter(link => {
      const performance = linkService.getLinkPerformance(
        link.clicks || 0,
        link.conversions || 0,
        link.revenue || 0
      );
      return performance.conversionRate <= 2 && link.clicks > 10;
    });
    
    setActiveLinks(active);
    setExpiredLinks(expired);
    
    return {
      active,
      expired,
      highPerforming,
      lowPerforming,
      total: trackingLinks.length
    };
  };
  
  const calculateStats = () => {
    const now = new Date();
    const activeLinks = trackingLinks.filter(link => new Date(link.expiresAt) > now);
    
    const totalClicks = trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalConversions = trackingLinks.reduce((sum, link) => sum + (link.conversions || 0), 0);
    const totalRevenue = trackingLinks.reduce((sum, link) => sum + (link.revenue || 0), 0);
    
    const activeClicks = activeLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const activeConversions = activeLinks.reduce((sum, link) => sum + (link.conversions || 0), 0);
    const activeRevenue = activeLinks.reduce((sum, link) => sum + (link.revenue || 0), 0);
    
    const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const activeConversionRate = activeClicks > 0 ? (activeConversions / activeClicks) * 100 : 0;
    
    const statsData = {
      totalLinks: trackingLinks.length,
      activeLinks: activeLinks.length,
      expiredLinks: trackingLinks.length - activeLinks.length,
      totalClicks,
      totalConversions,
      totalRevenue,
      activeClicks,
      activeConversions,
      activeRevenue,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      activeConversionRate: Math.round(activeConversionRate * 100) / 100,
      averageRevenuePerClick: totalClicks > 0 ? totalRevenue / totalClicks : 0,
      averageRevenuePerConversion: totalConversions > 0 ? totalRevenue / totalConversions : 0
    };
    
    setStats(statsData);
    return statsData;
  };
  
  const getLinkDetails = (linkId) => {
    return trackingLinks.find(link => link.linkId === linkId);
  };
  
  const deleteLink = async (linkId) => {
    try {
      const result = await linkService.deleteLink(linkId);
      
      if (result.success) {
        // Refresh links
        await fetchTrackingLinks();
        
        return {
          success: true,
          message: 'Link deleted successfully'
        };
      }
      
      return {
        success: false,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete link'
      };
    }
  };
  
  const getLinkPerformance = (linkId) => {
    const link = getLinkDetails(linkId);
    
    if (!link) {
      return null;
    }
    
    return linkService.getLinkPerformance(
      link.clicks || 0,
      link.conversions || 0,
      link.revenue || 0
    );
  };
  
  const getShareableLinks = (link) => {
    return linkService.getShareableLinks(link);
  };
  
  const getTimeUntilExpiry = (expiresAt) => {
    return linkService.getTimeUntilExpiry(expiresAt);
  };
  
  const generateQRCodeData = (link) => {
    return linkService.generateQRCodeData(link);
  };
  
  const bulkGenerateLinks = async (count) => {
    try {
      const links = await linkService.generateMultipleLinks(count);
      
      return {
        success: true,
        links,
        message: `${links.length} links generated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate links in bulk'
      };
    }
  };
  
  const trackLinkClick = async (linkId, userData = {}) => {
    try {
      const result = await linkService.trackLinkClick(linkId, userData);
      return result;
    } catch (error) {
      console.error('Failed to track link click:', error);
      return { success: false, message: 'Tracking failed' };
    }
  };
  
  useEffect(() => {
    if (trackingLinks.length > 0) {
      categorizeLinks();
      calculateStats();
    }
  }, [trackingLinks]);
  
  return {
    trackingLinks,
    activeLinks,
    expiredLinks,
    stats,
    loading,
    generateNewLink,
    getLinkDetails,
    deleteLink,
    getLinkPerformance,
    getShareableLinks,
    getTimeUntilExpiry,
    generateQRCodeData,
    bulkGenerateLinks,
    trackLinkClick,
    refreshLinks: fetchTrackingLinks,
    recalculateStats: calculateStats
  };
};

/**
 * Hook for link analytics
 */
export const useLinkAnalytics = (linkId) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  
  const loadAnalytics = async (id = linkId, range = timeRange) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await linkService.getLinkStats(id);
      
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load link analytics');
    } finally {
      setLoading(false);
    }
  };
  
  const getClickData = (range = timeRange) => {
    if (!analytics) return [];
    
    const now = new Date();
    let data = [];
    
    switch (range) {
      case '1h':
        data = Array.from({ length: 60 }, (_, i) => ({
          time: new Date(now - (59 - i) * 60 * 1000),
          clicks: Math.floor(Math.random() * 5)
        }));
        break;
        
      case '24h':
        data = Array.from({ length: 24 }, (_, i) => ({
          time: new Date(now - (23 - i) * 60 * 60 * 1000),
          clicks: Math.floor(Math.random() * 20)
        }));
        break;
        
      case '7d':
        data = Array.from({ length: 7 }, (_, i) => ({
          date: new Date(now - (6 - i) * 24 * 60 * 60 * 1000),
          clicks: Math.floor(Math.random() * 100)
        }));
        break;
        
      case '30d':
        data = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(now - (29 - i) * 24 * 60 * 60 * 1000),
          clicks: Math.floor(Math.random() * 50)
        }));
        break;
    }
    
    return data;
  };
  
  const getGeographicData = () => {
    if (!analytics) return [];
    
    // Mock geographic data
    return [
      { country: 'United States', clicks: 450, conversions: 45, revenue: 1800 },
      { country: 'United Kingdom', clicks: 320, conversions: 32, revenue: 1280 },
      { country: 'Canada', clicks: 280, conversions: 28, revenue: 1120 },
      { country: 'Australia', clicks: 210, conversions: 21, revenue: 840 },
      { country: 'Germany', clicks: 180, conversions: 18, revenue: 720 },
      { country: 'Kenya', clicks: 150, conversions: 15, revenue: 600 },
      { country: 'Other', clicks: 410, conversions: 41, revenue: 1640 }
    ];
  };
  
  const getDeviceData = () => {
    if (!analytics) return [];
    
    return [
      { device: 'Mobile', clicks: 850, percentage: 55 },
      { device: 'Desktop', clicks: 550, percentage: 35 },
      { device: 'Tablet', clicks: 150, percentage: 10 }
    ];
  };
  
  const getSourceData = () => {
    if (!analytics) return [];
    
    return [
      { source: 'Direct', clicks: 450, percentage: 29 },
      { source: 'Social Media', clicks: 520, percentage: 33.5 },
      { source: 'Email', clicks: 380, percentage: 24.5 },
      { source: 'Referral', clicks: 200, percentage: 13 }
    ];
  };
  
  const getConversionFunnel = () => {
    if (!analytics) return [];
    
    const clicks = analytics.clicks || 1550;
    const views = clicks * 3; // Estimate
    const addsToCart = clicks * 0.3; // 30% add to cart rate
    const conversions = analytics.conversions || 200;
    
    return [
      { stage: 'Views', count: Math.round(views), percentage: 100 },
      { stage: 'Clicks', count: clicks, percentage: (clicks / views) * 100 },
      { stage: 'Add to Cart', count: Math.round(addsToCart), percentage: (addsToCart / clicks) * 100 },
      { stage: 'Purchases', count: conversions, percentage: (conversions / addsToCart) * 100 }
    ];
  };
  
  const exportAnalytics = (format = 'csv') => {
    if (!analytics) return;
    
    let data = '';
    const exportDate = new Date().toISOString().split('T')[0];
    
    if (format === 'csv') {
      data = 'Metric,Value\n';
      data += `Total Clicks,${analytics.clicks || 0}\n`;
      data += `Total Conversions,${analytics.conversions || 0}\n`;
      data += `Total Revenue,${analytics.revenue || 0}\n`;
      data += `Conversion Rate,${analytics.conversionRate || 0}%\n`;
      data += `Average Order Value,$${analytics.averageOrderValue || 0}\n`;
      
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `link-analytics-${exportDate}.csv`;
      a.click();
    } else if (format === 'json') {
      data = JSON.stringify(analytics, null, 2);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `link-analytics-${exportDate}.json`;
      a.click();
    }
  };
  
  useEffect(() => {
    if (linkId) {
      loadAnalytics();
    }
  }, [linkId, timeRange]);
  
  return {
    analytics,
    loading,
    error,
    timeRange,
    setTimeRange,
    getClickData,
    getGeographicData,
    getDeviceData,
    getSourceData,
    getConversionFunnel,
    exportAnalytics,
    refresh: () => loadAnalytics(linkId, timeRange)
  };
};

// Import useState and useEffect
import { useState, useEffect } from 'react';
