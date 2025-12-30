const crypto = require('crypto');
const TrackingLink = require('../models/TrackingLink');
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Generate tracking link (Super Admin Only)
 */
exports.generateTrackingLink = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { name, campaign, expiresIn = 24 } = req.body;

    // Generate unique token
    const token = `SUPER-${crypto.randomBytes(8).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    // Create tracking link
    const trackingLink = new TrackingLink({
      token,
      name: name || `Campaign-${Date.now()}`,
      campaign: campaign || 'general',
      generatedBy: req.user.id,
      expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
      destinationUrl: process.env.FRONTEND_URL || 'https://ecommercepro.com',
      metadata: {
        source: 'super-admin',
        campaign,
        generatedAt: new Date()
      }
    });

    await trackingLink.save();

    // Construct full URL
    const fullUrl = `${trackingLink.destinationUrl}/?ref=${token}`;

    logger.info(`Tracking link generated: ${token} by ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Tracking link generated successfully',
      data: {
        link: fullUrl,
        token,
        trackingLink: {
          id: trackingLink._id,
          name: trackingLink.name,
          campaign: trackingLink.campaign,
          expiresAt: trackingLink.expiresAt,
          clicks: trackingLink.clicks,
          conversions: trackingLink.conversions,
          revenue: trackingLink.revenue
        },
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`
      }
    });
  } catch (error) {
    logger.error('Generate tracking link error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate tracking link'
    });
  }
};

/**
 * Get all tracking links (Super Admin Only)
 */
exports.getAllTrackingLinks = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      status = 'active',
      campaign,
      startDate,
      endDate,
      sort = '-createdAt'
    } = req.query;

    // Build filter
    const filter = { generatedBy: req.user.id };
    
    if (status === 'active') {
      filter.expiresAt = { $gt: new Date() };
    } else if (status === 'expired') {
      filter.expiresAt = { $lte: new Date() };
    }
    
    if (campaign) {
      filter.campaign = campaign;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await TrackingLink.countDocuments(filter);

    const trackingLinks = await TrackingLink.find(filter)
      .populate('generatedBy', 'email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate summary statistics
    const summary = await TrackingLink.aggregate([
      { $match: { generatedBy: req.user.id } },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          totalConversions: { $sum: '$conversions' },
          totalRevenue: { $sum: '$revenue' },
          activeLinks: {
            $sum: {
              $cond: [{ $gt: ['$expiresAt', new Date()] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get campaign performance
    const campaignPerformance = await TrackingLink.aggregate([
      { $match: { generatedBy: req.user.id } },
      {
        $group: {
          _id: '$campaign',
          links: { $sum: 1 },
          clicks: { $sum: '$clicks' },
          conversions: { $sum: '$conversions' },
          revenue: { $sum: '$revenue' }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ['$clicks', 0] },
              0,
              { $multiply: [{ $divide: ['$conversions', '$clicks'] }, 100] }
            ]
          },
          revenuePerClick: {
            $cond: [
              { $eq: ['$clicks', 0] },
              0,
              { $divide: ['$revenue', '$clicks'] }
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        trackingLinks,
        summary: summary[0] || {
          totalLinks: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          activeLinks: 0
        },
        campaignPerformance,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get all tracking links error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tracking links'
    });
  }
};

/**
 * Get tracking link analytics (Super Admin Only)
 */
exports.getLinkAnalytics = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const linkId = req.params.id;

    const trackingLink = await TrackingLink.findById(linkId)
      .populate('generatedBy', 'email')
      .populate('clickEvents.user', 'email role')
      .populate('conversionEvents.order', 'orderNumber totalAmount');

    if (!trackingLink) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking link not found'
      });
    }

    // Check ownership
    if (trackingLink.generatedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Calculate hourly/daily analytics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get hourly clicks for last 24 hours
    const hourlyClicks = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(hourStart.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourEnd.getHours() + 1);

      const clicksInHour = trackingLink.clickEvents.filter(click => 
        click.timestamp >= hourStart && click.timestamp < hourEnd
      ).length;

      hourlyClicks.push({
        hour: hourStart.toISOString(),
        clicks: clicksInHour
      });
    }

    // Get conversion funnel
    const totalClicks = trackingLink.clicks;
    const totalConversions = trackingLink.conversions;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const revenuePerClick = totalClicks > 0 ? trackingLink.revenue / totalClicks : 0;
    const averageOrderValue = totalConversions > 0 ? trackingLink.revenue / totalConversions : 0;

    // Get geographic distribution
    const geographicData = trackingLink.clickEvents.reduce((acc, click) => {
      const country = click.geoData?.country || 'Unknown';
      if (!acc[country]) {
        acc[country] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      acc[country].clicks++;
      
      // Check if this click led to conversion
      const conversion = trackingLink.conversionEvents.find(conv => 
        conv.clickId?.toString() === click._id.toString()
      );
      if (conversion) {
        acc[country].conversions++;
        acc[country].revenue += conversion.revenue || 0;
      }
      return acc;
    }, {});

    // Get device breakdown
    const deviceData = trackingLink.clickEvents.reduce((acc, click) => {
      const device = click.userAgent?.device || 'Unknown';
      const browser = click.userAgent?.browser || 'Unknown';
      const os = click.userAgent?.os || 'Unknown';
      
      if (!acc[device]) {
        acc[device] = { count: 0, browsers: {}, os: {} };
      }
      acc[device].count++;
      
      if (!acc[device].browsers[browser]) {
        acc[device].browsers[browser] = 0;
      }
      acc[device].browsers[browser]++;
      
      if (!acc[device].os[os]) {
        acc[device].os[os] = 0;
      }
      acc[device].os[os]++;
      
      return acc;
    }, {});

    // Get referral sources
    const referralSources = trackingLink.clickEvents.reduce((acc, click) => {
      const source = click.referrer || 'Direct';
      if (!acc[source]) {
        acc[source] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      acc[source].clicks++;
      
      const conversion = trackingLink.conversionEvents.find(conv => 
        conv.clickId?.toString() === click._id.toString()
      );
      if (conversion) {
        acc[source].conversions++;
        acc[source].revenue += conversion.revenue || 0;
      }
      return acc;
    }, {});

    // Get recent activity
    const recentActivity = trackingLink.clickEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20)
      .map(click => ({
        timestamp: click.timestamp,
        ip: click.ip,
        country: click.geoData?.country,
        city: click.geoData?.city,
        device: click.userAgent?.device,
        browser: click.userAgent?.browser,
        converted: trackingLink.conversionEvents.some(conv => 
          conv.clickId?.toString() === click._id.toString()
        )
      }));

    res.status(200).json({
      status: 'success',
      data: {
        linkInfo: {
          id: trackingLink._id,
          token: trackingLink.token,
          name: trackingLink.name,
          campaign: trackingLink.campaign,
          createdAt: trackingLink.createdAt,
          expiresAt: trackingLink.expiresAt,
          isActive: trackingLink.expiresAt > new Date(),
          destinationUrl: trackingLink.destinationUrl,
          fullUrl: `${trackingLink.destinationUrl}/?ref=${trackingLink.token}`
        },
        metrics: {
          totalClicks,
          totalConversions,
          conversionRate: conversionRate.toFixed(2),
          totalRevenue: trackingLink.revenue,
          revenuePerClick: revenuePerClick.toFixed(2),
          averageOrderValue: averageOrderValue.toFixed(2),
          clickThroughRate: '2.5%' // This would be calculated from impressions
        },
        hourlyClicks,
        geographic: Object.entries(geographicData).map(([country, data]) => ({
          country,
          clicks: data.clicks,
          conversions: data.conversions,
          revenue: data.revenue,
          conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
        })),
        devices: Object.entries(deviceData).map(([device, data]) => ({
          device,
          count: data.count,
          percentage: (data.count / totalClicks) * 100,
          browsers: Object.entries(data.browsers).map(([browser, count]) => ({
            browser,
            count,
            percentage: (count / data.count) * 100
          })),
          os: Object.entries(data.os).map(([os, count]) => ({
            os,
            count,
            percentage: (count / data.count) * 100
          }))
        })),
        referrals: Object.entries(referralSources).map(([source, data]) => ({
          source,
          clicks: data.clicks,
          conversions: data.conversions,
          revenue: data.revenue,
          conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
        })),
        recentActivity,
        generatedBy: trackingLink.generatedBy.email
      }
    });
  } catch (error) {
    logger.error('Get link analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch link analytics'
    });
  }
};

/**
 * Track link click
 */
exports.trackClick = async (req, res) => {
  try {
    const { token } = req.params;
    const { 
      referrer,
      userAgent: rawUserAgent,
      ip,
      screenResolution,
      language,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content
    } = req.body;

    // Find tracking link
    const trackingLink = await TrackingLink.findOne({ token });
    if (!trackingLink) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid tracking link'
      });
    }

    // Check if link is expired
    if (trackingLink.expiresAt < new Date()) {
      return res.status(410).json({
        status: 'error',
        message: 'Tracking link has expired'
      });
    }

    // Parse user agent
    let userAgent = {};
    try {
      if (rawUserAgent) {
        // Simplified user agent parsing
        const ua = rawUserAgent.toLowerCase();
        userAgent = {
          browser: ua.includes('chrome') ? 'Chrome' : 
                   ua.includes('firefox') ? 'Firefox' : 
                   ua.includes('safari') ? 'Safari' : 
                   ua.includes('edge') ? 'Edge' : 'Other',
          os: ua.includes('windows') ? 'Windows' : 
              ua.includes('mac') ? 'Mac OS' : 
              ua.includes('linux') ? 'Linux' : 
              ua.includes('android') ? 'Android' : 
              ua.includes('ios') ? 'iOS' : 'Other',
          device: ua.includes('mobile') ? 'Mobile' : 
                  ua.includes('tablet') ? 'Tablet' : 'Desktop',
          raw: rawUserAgent
        };
      }
    } catch (error) {
      logger.error('User agent parsing error:', error);
    }

    // Get geo data (simplified - in production use geoip service)
    let geoData = {};
    if (ip) {
      // Simplified geo detection based on IP
      // In production, use: geoip-lite or similar service
      geoData = {
        ip,
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown'
      };
    }

    // Create click event
    const clickEvent = {
      timestamp: new Date(),
      ip,
      userAgent,
      geoData,
      referrer,
      screenResolution,
      language,
      utmParams: {
        source: utm_source,
        medium: utm_medium,
        campaign: utm_campaign,
        term: utm_term,
        content: utm_content
      }
    };

    // If user is authenticated, associate with user
    if (req.user) {
      clickEvent.user = req.user.id;
    }

    // Add click event
    trackingLink.clickEvents.push(clickEvent);
    trackingLink.clicks++;
    trackingLink.lastClickAt = new Date();

    await trackingLink.save();

    // Store click ID in session for conversion tracking
    const clickId = trackingLink.clickEvents[trackingLink.clickEvents.length - 1]._id;
    req.session.trackingClickId = clickId;
    req.session.trackingToken = token;

    logger.info(`Link click tracked: ${token} from IP ${ip}`);

    // Redirect to destination URL
    res.status(200).json({
      status: 'success',
      message: 'Click tracked successfully',
      data: {
        clickId,
        redirectTo: trackingLink.destinationUrl,
        token,
        campaign: trackingLink.campaign
      }
    });
  } catch (error) {
    logger.error('Track click error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track click'
    });
  }
};

/**
 * Track conversion
 */
exports.trackConversion = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const { token } = req.params;

    // Find tracking link
    const trackingLink = await TrackingLink.findOne({ token });
    if (!trackingLink) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid tracking link'
      });
    }

    // Get the click that led to this conversion
    const clickId = req.session?.trackingClickId;
    if (!clickId && !req.user) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot track conversion without click reference'
      });
    }

    // Find the click event
    let clickEvent;
    if (clickId) {
      clickEvent = trackingLink.clickEvents.id(clickId);
    } else if (req.user) {
      // Find latest click by this user
      clickEvent = trackingLink.clickEvents
        .filter(click => click.user?.toString() === req.user.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    }

    // Create conversion event
    const conversionEvent = {
      timestamp: new Date(),
      order: orderId,
      amount: parseFloat(amount) || 0,
      clickId: clickEvent?._id,
      user: req.user?.id,
      metadata: {
        trackedAt: new Date(),
        sessionId: req.sessionID
      }
    };

    // Add conversion event
    trackingLink.conversionEvents.push(conversionEvent);
    trackingLink.conversions++;
    trackingLink.revenue += conversionEvent.amount;
    trackingLink.lastConversionAt = new Date();

    await trackingLink.save();

    // Clear session tracking data
    if (req.session) {
      delete req.session.trackingClickId;
      delete req.session.trackingToken;
    }

    logger.info(`Conversion tracked: ${token} for order ${orderId} amount ${amount}`);

    res.status(200).json({
      status: 'success',
      message: 'Conversion tracked successfully',
      data: {
        conversionId: conversionEvent._id,
        token,
        amount: conversionEvent.amount,
        orderId,
        timestamp: conversionEvent.timestamp
      }
    });
  } catch (error) {
    logger.error('Track conversion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track conversion'
    });
  }
};

/**
 * Update tracking link (Super Admin Only)
 */
exports.updateTrackingLink = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const linkId = req.params.id;
    const updates = req.body;

    const trackingLink = await TrackingLink.findById(linkId);
    if (!trackingLink) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking link not found'
      });
    }

    // Check ownership
    if (trackingLink.generatedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Remove restricted fields
    delete updates.token;
    delete updates.clicks;
    delete updates.conversions;
    delete updates.revenue;
    delete updates.clickEvents;
    delete updates.conversionEvents;
    delete updates.generatedBy;

    // Update tracking link
    Object.assign(trackingLink, updates);
    trackingLink.updatedAt = new Date();

    await trackingLink.save();

    logger.info(`Tracking link updated: ${trackingLink.token} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Tracking link updated successfully',
      data: { trackingLink }
    });
  } catch (error) {
    logger.error('Update tracking link error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update tracking link'
    });
  }
};

/**
 * Delete tracking link (Super Admin Only)
 */
exports.deleteTrackingLink = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const linkId = req.params.id;

    const trackingLink = await TrackingLink.findById(linkId);
    if (!trackingLink) {
      return res.status(404).json({
        status: 'error',
        message: 'Tracking link not found'
      });
    }

    // Check ownership
    if (trackingLink.generatedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Soft delete
    trackingLink.isDeleted = true;
    trackingLink.deletedAt = new Date();
    trackingLink.deletedBy = req.user.id;

    await trackingLink.save();

    logger.info(`Tracking link deleted: ${trackingLink.token} by ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Tracking link deleted successfully'
    });
  } catch (error) {
    logger.error('Delete tracking link error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete tracking link'
    });
  }
};

/**
 * Bulk generate tracking links (Super Admin Only)
 */
exports.bulkGenerateLinks = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { count = 10, campaign, expiresIn = 24 } = req.body;

    if (count > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot generate more than 100 links at once'
      });
    }

    const generatedLinks = [];

    for (let i = 0; i < count; i++) {
      const token = `SUPER-BULK-${crypto.randomBytes(6).toString('hex').toUpperCase()}-${(i + 1).toString().padStart(3, '0')}`;
      
      const trackingLink = new TrackingLink({
        token,
        name: `Bulk Link ${i + 1}`,
        campaign: campaign || `bulk-campaign-${Date.now()}`,
        generatedBy: req.user.id,
        expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
        destinationUrl: process.env.FRONTEND_URL || 'https://ecommercepro.com',
        metadata: {
          source: 'bulk-generation',
          batchId: Date.now(),
          index: i + 1
        }
      });

      await trackingLink.save();

      const fullUrl = `${trackingLink.destinationUrl}/?ref=${token}`;

      generatedLinks.push({
        link: fullUrl,
        token,
        name: trackingLink.name,
        expiresAt: trackingLink.expiresAt
      });
    }

    logger.info(`Bulk generated ${count} tracking links by ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      message: `Successfully generated ${count} tracking links`,
      data: {
        links: generatedLinks,
        summary: {
          count,
          campaign,
          expiresIn,
          generatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Bulk generate links error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to bulk generate tracking links'
    });
  }
};

/**
 * Get link performance report (Super Admin Only)
 */
exports.getLinkPerformanceReport = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { startDate, endDate, format = 'json' } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get performance data
    const performanceData = await TrackingLink.aggregate([
      {
        $match: {
          generatedBy: req.user.id,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          token: 1,
          name: 1,
          campaign: 1,
          createdAt: 1,
          expiresAt: 1,
          clicks: 1,
          conversions: 1,
          revenue: 1,
          isActive: { $gt: ['$expiresAt', new Date()] },
          clickEvents: { $size: '$clickEvents' },
          conversionEvents: { $size: '$conversionEvents' }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ['$clicks', 0] },
              0,
              { $multiply: [{ $divide: ['$conversions', '$clicks'] }, 100] }
            ]
          },
          revenuePerClick: {
            $cond: [
              { $eq: ['$clicks', 0] },
              0,
              { $divide: ['$revenue', '$clicks'] }
            ]
          },
          averageOrderValue: {
            $cond: [
              { $eq: ['$conversions', 0] },
              0,
              { $divide: ['$revenue', '$conversions'] }
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Calculate summary statistics
    const summary = performanceData.reduce((acc, link) => {
      acc.totalClicks += link.clicks;
      acc.totalConversions += link.conversions;
      acc.totalRevenue += link.revenue;
      acc.activeLinks += link.isActive ? 1 : 0;
      return acc;
    }, {
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      activeLinks: 0,
      totalLinks: performanceData.length
    });

    summary.conversionRate = summary.totalClicks > 0 ? 
      (summary.totalConversions / summary.totalClicks) * 100 : 0;
    summary.revenuePerClick = summary.totalClicks > 0 ? 
      summary.totalRevenue / summary.totalClicks : 0;

    // Get campaign performance
    const campaignPerformance = await TrackingLink.aggregate([
      {
        $match: {
          generatedBy: req.user.id,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$campaign',
          links: { $sum: 1 },
          clicks: { $sum: '$clicks' },
          conversions: { $sum: '$conversions' },
          revenue: { $sum: '$revenue' }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $eq: ['$clicks', 0] },
              0,
              { $multiply: [{ $divide: ['$conversions', '$clicks'] }, 100] }
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Format response based on requested format
    if (format === 'csv') {
      // Convert to CSV
      const headers = ['Token', 'Name', 'Campaign', 'Created', 'Expires', 'Clicks', 'Conversions', 'Revenue', 'Conversion Rate', 'Revenue/Click', 'Status'];
      const rows = performanceData.map(link => [
        link.token,
        link.name,
        link.campaign,
        link.createdAt.toISOString(),
        link.expiresAt.toISOString(),
        link.clicks,
        link.conversions,
        link.revenue,
        `${link.conversionRate.toFixed(2)}%`,
        `$${link.revenuePerClick.toFixed(2)}`,
        link.isActive ? 'Active' : 'Expired'
      ]);

      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="link-performance-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send(csvContent);
    }

    // Default JSON response
    res.status(200).json({
      status: 'success',
      data: {
        period: { start, end },
        summary,
        performanceData,
        campaignPerformance,
        topPerforming: performanceData.slice(0, 5),
        worstPerforming: performanceData.slice(-5).reverse(),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Get link performance report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate performance report'
    });
  }
};