import { linkApi } from './api';

export const linkService = {
  generateTrackingLink: async () => {
    try {
      const response = await linkApi.generateTrackingLink();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to generate tracking link' };
    }
  },

  getTrackingLinks: async () => {
    try {
      const response = await linkApi.getTrackingLinks();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch tracking links' };
    }
  },

  getLinkStats: async (linkId) => {
    try {
      const response = await linkApi.getLinkStats(linkId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch link statistics' };
    }
  },

  deleteLink: async (linkId) => {
    try {
      const response = await linkApi.deleteLink(linkId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete link' };
    }
  },

  // Helper methods
  generateLinkId: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'SUPER-';
    for (let i = 0; i < 10; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  },

  formatLink: (baseUrl, linkId) => {
    return `${baseUrl}?ref=${linkId}`;
  },

  parseLinkData: (url) => {
    try {
      const urlObj = new URL(url);
      const ref = urlObj.searchParams.get('ref');
      
      if (!ref) return null;
      
      return {
        linkId: ref,
        baseUrl: urlObj.origin + urlObj.pathname,
        fullUrl: url
      };
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  },

  validateLink: (link) => {
    const errors = [];
    
    if (!link) {
      errors.push('Link is required');
      return { isValid: false, errors };
    }
    
    try {
      new URL(link);
    } catch (error) {
      errors.push('Invalid URL format');
    }
    
    if (!link.includes('ref=')) {
      errors.push('Link must contain tracking reference (ref parameter)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getLinkPerformance: (clicks, conversions, revenue) => {
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const revenuePerClick = clicks > 0 ? revenue / clicks : 0;
    const revenuePerConversion = conversions > 0 ? revenue / conversions : 0;
    
    return {
      conversionRate,
      revenuePerClick,
      revenuePerConversion,
      clicks,
      conversions,
      revenue
    };
  },

  categorizeLinks: (links) => {
    const now = new Date();
    
    return {
      active: links.filter(link => new Date(link.expiresAt) > now),
      expired: links.filter(link => new Date(link.expiresAt) <= now),
      highPerforming: links.filter(link => {
        const performance = linkService.getLinkPerformance(
          link.clicks || 0,
          link.conversions || 0,
          link.revenue || 0
        );
        return performance.conversionRate > 10; // Links with >10% conversion rate
      }),
      lowPerforming: links.filter(link => {
        const performance = linkService.getLinkPerformance(
          link.clicks || 0,
          link.conversions || 0,
          link.revenue || 0
        );
        return performance.conversionRate <= 2; // Links with ≤2% conversion rate
      })
    };
  },

  generateQRCodeData: (link) => {
    return {
      data: link,
      size: 200,
      margin: 2,
      color: {
        dark: '#4f46e5',
        light: '#ffffff'
      }
    };
  },

  // Link analytics tracking
  trackLinkClick: async (linkId, userData = {}) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/links/${linkId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
          ...userData
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error tracking link click:', error);
      return { success: false, message: 'Tracking failed' };
    }
  },

  // Bulk link operations
  generateMultipleLinks: async (count) => {
    const links = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const link = await linkService.generateTrackingLink();
        if (link.success) {
          links.push(link.data);
        }
      } catch (error) {
        console.error(`Error generating link ${i + 1}:`, error);
      }
    }
    
    return links;
  },

  // Link sharing utilities
  getShareableLinks: (link) => {
    const encodedLink = encodeURIComponent(link);
    
    return {
      whatsapp: `https://wa.me/?text=${encodedLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedLink}`,
      telegram: `https://t.me/share/url?url=${encodedLink}`,
      email: `mailto:?body=${encodedLink}`
    };
  },

  // Link expiration utilities
  getTimeUntilExpiry: (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: 'Expired' };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { expired: false, text: `${days} day${days !== 1 ? 's' : ''} left` };
    }
    
    return { 
      expired: false, 
      text: `${hours}h ${minutes}m left`,
      hours,
      minutes 
    };
  }
};
