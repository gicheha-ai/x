const crypto = require('crypto');
const TrackingLink = require('../models/TrackingLink');
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const Order = require('../models/Order');

class LinkService {
  // ==================== LINK GENERATION ====================
  
  /**
   * Generate unique tracking link for super admin
   */
  async generateTrackingLink(adminUser, linkData = {}) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const {
        campaignName = 'Direct Traffic',
        source = 'direct',
        medium = 'referral',
        expiresInHours = 24,
        maxClicks = null,
        metadata = {}
      } = linkData;

      // Generate unique token
      const token = crypto.randomBytes(16).toString('hex');
      const shortCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      // Create tracking ID
      const trackingId = `SUPER-${shortCode}-${Date.now().toString(36)}`;
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Create tracking link
      const trackingLink = new TrackingLink({
        trackingId,
        generatedBy: adminUser._id,
        campaignName,
        source,
        medium,
        originalUrl: process.env.FRONTEND_URL || 'https://yourecommerce.com',
        trackingUrl: `${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/?ref=${trackingId}`,
        expiresAt,
        maxClicks,
        metadata: {
          ...metadata,
          superAdminEmail: adminUser.email,
          generationTime: new Date()
        },
        status: 'active'
      });

      await trackingLink.save();

      // Create click record for initial generation
      await this.recordClick(trackingId, {
        ip: '0.0.0.0',
        userAgent: 'System Generated',
        referrer: 'direct',
        isInitial: true
      });

      return {
        success: true,
        trackingLink: {
          id: trackingLink._id,
          trackingId: trackingLink.trackingId,
          campaignName: trackingLink.campaignName,
          trackingUrl: trackingLink.trackingUrl,
          shortUrl: await this.generateShortUrl(trackingLink.trackingUrl),
          expiresAt: trackingLink.expiresAt,
          maxClicks: trackingLink.maxClicks,
          metadata: trackingLink.metadata,
          createdAt: trackingLink.createdAt
        },
        analyticsUrl: `${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/admin/links/${trackingLink.trackingId}`,
        embedCode: this.generateEmbedCode(trackingLink.trackingUrl)
      };
    } catch (error) {
      console.error('Link generation error:', error);
      throw new Error(`Link generation failed: ${error.message}`);
    }
  }

  // ==================== CLICK TRACKING ====================
  
  /**
   * Record a click on a tracking link
   */
  async recordClick(trackingId, clickData) {
    try {
      const {
        ip,
        userAgent,
        referrer = 'direct',
        landingPage = '/',
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        userId = null
      } = clickData;

      // Find active tracking link
      const trackingLink = await TrackingLink.findOne({
        trackingId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      });

      if (!trackingLink) {
        throw new Error('Tracking link not found or expired');
      }

      // Check max clicks limit
      if (trackingLink.maxClicks && trackingLink.clicks >= trackingLink.maxClicks) {
        trackingLink.status = 'limit_reached';
        await trackingLink.save();
        throw new Error('Maximum clicks reached for this link');
      }

      // Record click
      const click = {
        timestamp: new Date(),
        ip,
        userAgent,
        referrer,
        landingPage,
        utmSource: utmSource || trackingLink.source,
        utmMedium: utmMedium || trackingLink.medium,
        utmCampaign: utmCampaign || trackingLink.campaignName,
        utmTerm,
        utmContent,
        userId,
        sessionId: this.generateSessionId(ip, userAgent)
      };

      trackingLink.clicks.push(click);
      trackingLink.totalClicks += 1;
      trackingLink.lastClickAt = new Date();

      // Update geographic data if available
      if (ip && ip !== '0.0.0.0') {
        const location = await this.getLocationFromIP(ip);
        if (location) {
          click.location = location;
          
          // Update link's geographic stats
          const countryCode = location.country_code || 'Unknown';
          if (!trackingLink.geoStats.countries[countryCode]) {
            trackingLink.geoStats.countries[countryCode] = 0;
          }
          trackingLink.geoStats.countries[countryCode] += 1;
        }
      }

      // Update device/browser stats
      const deviceInfo = this.parseUserAgent(userAgent);
      if (deviceInfo) {
        click.device = deviceInfo;
        
        if (deviceInfo.isMobile) {
          trackingLink.deviceStats.mobile += 1;
        } else if (deviceInfo.isTablet) {
          trackingLink.deviceStats.tablet += 1;
        } else {
          trackingLink.deviceStats.desktop += 1;
        }

        if (deviceInfo.browser) {
          if (!trackingLink.browserStats[deviceInfo.browser]) {
            trackingLink.browserStats[deviceInfo.browser] = 0;
          }
          trackingLink.browserStats[deviceInfo.browser] += 1;
        }
      }

      await trackingLink.save();

      // Create or update session
      await this.updateSession(click.sessionId, trackingId, userId);

      return {
        success: true,
        clickId: click._id || click.timestamp.getTime(),
        redirectUrl: trackingLink.originalUrl,
        trackingLink: trackingLink.trackingId,
        sessionId: click.sessionId
      };
    } catch (error) {
      console.error('Click recording error:', error);
      throw error;
    }
  }

  // ==================== CONVERSION TRACKING ====================
  
  /**
   * Record a conversion from a tracking link
   */
  async recordConversion(trackingId, conversionData) {
    try {
      const {
        orderId,
        amount,
        revenue,
        userId,
        sessionId,
        metadata = {}
      } = conversionData;

      // Find tracking link
      const trackingLink = await TrackingLink.findOne({ trackingId });
      if (!trackingLink) {
        throw new Error('Tracking link not found');
      }

      // Find the session
      const session = trackingLink.sessions.find(s => s.sessionId === sessionId);
      if (!session) {
        throw new Error('Session not found for this conversion');
      }

      // Record conversion
      const conversion = {
        timestamp: new Date(),
        orderId,
        amount,
        revenue,
        userId,
        sessionId,
        metadata,
        status: 'completed'
      };

      trackingLink.conversions.push(conversion);
      trackingLink.totalConversions += 1;
      trackingLink.totalRevenue += revenue || amount || 0;
      trackingLink.lastConversionAt = new Date();

      // Update session with conversion
      session.conversions = session.conversions || [];
      session.conversions.push(conversion);
      session.lastActivityAt = new Date();

      // Update conversion rate
      trackingLink.conversionRate = trackingLink.totalClicks > 0 ? 
        (trackingLink.totalConversions / trackingLink.totalClicks) * 100 : 0;

      // Update average order value
      if (trackingLink.totalConversions > 0) {
        trackingLink.averageOrderValue = trackingLink.totalRevenue / trackingLink.totalConversions;
      }

      await trackingLink.save();

      // Attribute revenue to super admin if applicable
      if (revenue > 0) {
        await this.attributeRevenueToLink(trackingId, revenue, orderId, userId);
      }

      return {
        success: true,
        conversion,
        trackingLink: {
          id: trackingLink._id,
          trackingId: trackingLink.trackingId,
          totalConversions: trackingLink.totalConversions,
          totalRevenue: trackingLink.totalRevenue,
          conversionRate: trackingLink.conversionRate
        }
      };
    } catch (error) {
      console.error('Conversion recording error:', error);
      throw error;
    }
  }

  // ==================== REVENUE ATTRIBUTION ====================
  
  /**
   * Attribute revenue to a tracking link
   */
  async attributeRevenueToLink(trackingId, amount, orderId, userId) {
    try {
      // Record revenue with link attribution
      const revenue = new Revenue({
        amount,
        source: 'link_tracking',
        paymentMethod: 'attributed',
        order: orderId,
        user: userId,
        description: `Revenue attributed to tracking link: ${trackingId}`,
        metadata: {
          trackingId,
          attributionModel: 'last_click',
          attributionTime: new Date()
        },
        recordedAt: new Date()
      });

      await revenue.save();

      // Update tracking link revenue stats
      await TrackingLink.findOneAndUpdate(
        { trackingId },
        {
          $inc: { attributedRevenue: amount },
          $set: { lastRevenueAt: new Date() }
        }
      );

      return revenue;
    } catch (error) {
      console.error('Revenue attribution error:', error);
      throw error;
    }
  }

  // ==================== LINK ANALYTICS ====================
  
  /**
   * Get analytics for a tracking link
   */
  async getLinkAnalytics(trackingId, adminUser, options = {}) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const {
        timeframe = '24h',
        detailed = false
      } = options;

      // Find tracking link
      const trackingLink = await TrackingLink.findOne({ trackingId });
      if (!trackingLink) {
        throw new Error('Tracking link not found');
      }

      // Calculate time window
      let startTime = new Date();
      switch (timeframe) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '6h':
          startTime.setHours(startTime.getHours() - 6);
          break;
        case '12h':
          startTime.setHours(startTime.getHours() - 12);
          break;
        case '24h':
          startTime.setHours(startTime.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
        default:
          startTime.setHours(startTime.getHours() - 24);
      }

      // Filter clicks within timeframe
      const recentClicks = trackingLink.clicks.filter(
        click => new Date(click.timestamp) >= startTime
      );

      // Filter conversions within timeframe
      const recentConversions = trackingLink.conversions.filter(
        conv => new Date(conv.timestamp) >= startTime
      );

      // Calculate metrics
      const clicksInTimeframe = recentClicks.length;
      const conversionsInTimeframe = recentConversions.length;
      const revenueInTimeframe = recentConversions.reduce(
        (sum, conv) => sum + (conv.revenue || conv.amount || 0), 0
      );

      const conversionRate = clicksInTimeframe > 0 ? 
        (conversionsInTimeframe / clicksInTimeframe) * 100 : 0;

      const averageOrderValue = conversionsInTimeframe > 0 ? 
        revenueInTimeframe / conversionsInTimeframe : 0;

      // Get geographic distribution
      const geographicData = this.analyzeGeographicData(recentClicks);

      // Get device distribution
      const deviceData = this.analyzeDeviceData(recentClicks);

      // Get hourly activity
      const hourlyActivity = this.analyzeHourlyActivity(recentClicks);

      // Get referrer analysis
      const referrerAnalysis = this.analyzeReferrers(recentClicks);

      // Get UTM parameter effectiveness
      const utmAnalysis = this.analyzeUTMParameters(recentClicks, recentConversions);

      const analytics = {
        summary: {
          trackingId: trackingLink.trackingId,
          campaignName: trackingLink.campaignName,
          totalClicks: trackingLink.totalClicks,
          totalConversions: trackingLink.totalConversions,
          totalRevenue: trackingLink.totalRevenue,
          overallConversionRate: trackingLink.conversionRate,
          averageOrderValue: trackingLink.averageOrderValue,
          status: trackingLink.status,
          expiresAt: trackingLink.expiresAt,
          timeRemaining: trackingLink.expiresAt - new Date()
        },
        timeframeAnalysis: {
          timeframe,
          startTime,
          endTime: new Date(),
          clicks: clicksInTimeframe,
          conversions: conversionsInTimeframe,
          revenue: revenueInTimeframe,
          conversionRate,
          averageOrderValue,
          revenuePerClick: clicksInTimeframe > 0 ? revenueInTimeframe / clicksInTimeframe : 0
        },
        performanceMetrics: {
          clickThroughRate: this.calculateCTR(trackingLink),
          engagementRate: this.calculateEngagementRate(trackingLink),
          bounceRate: this.calculateBounceRate(trackingLink),
          returnVisitorRate: this.calculateReturnVisitorRate(trackingLink)
        },
        geographicDistribution: geographicData,
        deviceDistribution: deviceData,
        hourlyActivity,
        referrerAnalysis,
        utmAnalysis,
        generatedAt: new Date()
      };

      // Add detailed data if requested
      if (detailed) {
        analytics.detailedData = {
          recentClicks: recentClicks.slice(-50), // Last 50 clicks
          recentConversions: recentConversions.slice(-20), // Last 20 conversions
          topSessions: this.getTopSessions(trackingLink),
          conversionFunnel: this.analyzeConversionFunnel(trackingLink)
        };
      }

      return analytics;
    } catch (error) {
      console.error('Link analytics error:', error);
      throw error;
    }
  }

  // ==================== BULK LINK OPERATIONS ====================
  
  /**
   * Generate multiple tracking links at once
   */
  async generateBulkLinks(adminUser, count = 5, template = {}) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const links = [];
      const errors = [];

      for (let i = 0; i < count; i++) {
        try {
          const linkData = {
            campaignName: `${template.campaignName || 'Bulk Campaign'} ${i + 1}`,
            source: template.source || 'bulk',
            medium: template.medium || 'referral',
            expiresInHours: template.expiresInHours || 24,
            metadata: {
              ...template.metadata,
              batchId: `BATCH-${Date.now()}`,
              sequence: i + 1
            }
          };

          const link = await this.generateTrackingLink(adminUser, linkData);
          links.push(link.trackingLink);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message
          });
        }
      }

      return {
        success: true,
        generated: links.length,
        failed: errors.length,
        links,
        errors,
        batchId: `BATCH-${Date.now()}`,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Bulk link generation error:', error);
      throw error;
    }
  }

  /**
   * Update tracking link
   */
  async updateTrackingLink(trackingId, updates, adminUser) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const trackingLink = await TrackingLink.findOne({ trackingId });
      if (!trackingLink) {
        throw new Error('Tracking link not found');
      }

      // Allowed updates
      const allowedUpdates = [
        'campaignName',
        'status',
        'maxClicks',
        'metadata',
        'notes'
      ];

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          trackingLink[field] = updates[field];
        }
      });

      // Handle expiry extension
      if (updates.extendExpiryByHours) {
        trackingLink.expiresAt = new Date(
          trackingLink.expiresAt.getTime() + (updates.extendExpiryByHours * 60 * 60 * 1000)
        );
      }

      trackingLink.updatedAt = new Date();
      await trackingLink.save();

      return {
        success: true,
        trackingLink: {
          id: trackingLink._id,
          trackingId: trackingLink.trackingId,
          campaignName: trackingLink.campaignName,
          status: trackingLink.status,
          expiresAt: trackingLink.expiresAt,
          maxClicks: trackingLink.maxClicks,
          updatedAt: trackingLink.updatedAt
        }
      };
    } catch (error) {
      console.error('Link update error:', error);
      throw error;
    }
  }

  // ==================== LINK MANAGEMENT ====================
  
  /**
   * Get all tracking links for super admin
   */
  async getAllTrackingLinks(adminUser, filters = {}) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const {
        status,
        startDate,
        endDate,
        campaignName,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = filters;

      const query = { generatedBy: adminUser._id };

      if (status) query.status = status;
      if (campaignName) query.campaignName = { $regex: campaignName, $options: 'i' };
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const trackingLinks = await TrackingLink.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .select('-clicks -conversions -sessions') // Exclude large arrays
        .lean();

      const total = await TrackingLink.countDocuments(query);

      // Calculate summary stats
      const summary = await TrackingLink.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalLinks: { $sum: 1 },
            totalClicks: { $sum: '$totalClicks' },
            totalConversions: { $sum: '$totalConversions' },
            totalRevenue: { $sum: '$totalRevenue' },
            activeLinks: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$status', 'active'] },
                    { $gt: ['$expiresAt', new Date()] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        success: true,
        trackingLinks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summary[0] || {
          totalLinks: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          activeLinks: 0
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Get all links error:', error);
      throw error;
    }
  }

  // ==================== LINK EXPIRATION MANAGEMENT ====================
  
  /**
   * Clean up expired tracking links
   */
  async cleanupExpiredLinks() {
    try {
      const expiredLinks = await TrackingLink.find({
        status: 'active',
        expiresAt: { $lt: new Date() }
      });

      const updatePromises = expiredLinks.map(link => 
        TrackingLink.findByIdAndUpdate(link._id, { status: 'expired' })
      );

      await Promise.all(updatePromises);

      return {
        success: true,
        expiredCount: expiredLinks.length,
        cleanedAt: new Date()
      };
    } catch (error) {
      console.error('Link cleanup error:', error);
      throw error;
    }
  }

  /**
   * Extend link expiry
   */
  async extendLinkExpiry(trackingId, additionalHours, adminUser) {
    try {
      // Verify super admin access
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }

      const trackingLink = await TrackingLink.findOne({ trackingId });
      if (!trackingLink) {
        throw new Error('Tracking link not found');
      }

      const newExpiry = new Date(
        trackingLink.expiresAt.getTime() + (additionalHours * 60 * 60 * 1000)
      );

      trackingLink.expiresAt = newExpiry;
      trackingLink.status = 'active';
      trackingLink.updatedAt = new Date();
      await trackingLink.save();

      return {
        success: true,
        trackingId: trackingLink.trackingId,
        oldExpiry: trackingLink.expiresAt,
        newExpiry,
        additionalHours,
        updatedAt: trackingLink.updatedAt
      };
    } catch (error) {
      console.error('Link expiry extension error:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS HELPER METHODS ====================
  
  /**
   * Generate session ID
   */
  generateSessionId(ip, userAgent) {
    const data = `${ip}-${userAgent}-${Math.floor(Date.now() / (1000 * 60 * 30))}`; // 30-minute sessions
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Update session data
   */
  async updateSession(sessionId, trackingId, userId) {
    try {
      const trackingLink = await TrackingLink.findOne({ trackingId });
      if (!trackingLink) return;

      let session = trackingLink.sessions.find(s => s.sessionId === sessionId);
      
      if (!session) {
        session = {
          sessionId,
          userId,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          clickCount: 0,
          conversions: []
        };
        trackingLink.sessions.push(session);
      }

      session.clickCount += 1;
      session.lastActivityAt = new Date();
      
      if (userId && !session.userId) {
        session.userId = userId;
      }

      await trackingLink.save();
    } catch (error) {
      console.error('Session update error:', error);
    }
  }

  /**
   * Parse user agent for device info
   */
  parseUserAgent(userAgent) {
    const ua = userAgent.toLowerCase();
    
    return {
      isMobile: /mobile|android|iphone|ipod|blackberry|opera mini/i.test(ua),
      isTablet: /tablet|ipad/i.test(ua),
      isDesktop: !/mobile|android|iphone|ipod|blackberry|opera mini|tablet|ipad/i.test(ua),
      browser: this.extractBrowser(ua),
      os: this.extractOS(ua)
    };
  }

  extractBrowser(ua) {
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    if (/opera/i.test(ua)) return 'Opera';
    return 'Unknown';
  }

  extractOS(ua) {
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac os/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/ios|iphone|ipad/i.test(ua)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get location from IP (simplified - in production use a service like ipstack)
   */
  async getLocationFromIP(ip) {
    // This is a simplified version. In production, use a proper IP geolocation service
    try {
      // For demo purposes, return mock data
      // In production, you would call an API like:
      // const response = await axios.get(`http://api.ipstack.com/${ip}?access_key=YOUR_KEY`);
      // return response.data;
      
      return {
        country_code: 'US',
        country_name: 'United States',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194
      };
    } catch (error) {
      console.error('IP location lookup error:', error);
      return null;
    }
  }

  /**
   * Generate short URL
   */
  async generateShortUrl(longUrl) {
    // In production, use a URL shortener service
    const shortCode = crypto.randomBytes(4).toString('hex');
    return `${process.env.SHORT_DOMAIN || 'https://short.ecom.com'}/${shortCode}`;
  }

  /**
   * Generate embed code for the link
   */
  generateEmbedCode(trackingUrl) {
    return `
<!-- E-Commerce Pro Platform Tracking Pixel -->
<script>
  (function() {
    var pixel = document.createElement('img');
    pixel.src = '${process.env.BACKEND_URL || 'https://api.yourecommerce.com'}/track/pixel?url=${encodeURIComponent(trackingUrl)}';
    pixel.style.display = 'none';
    document.body.appendChild(pixel);
    
    // Track clicks on links
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (link && link.href.includes('${process.env.FRONTEND_URL || 'yourecommerce.com'}')) {
        // Record click via beacon API
        navigator.sendBeacon('${process.env.BACKEND_URL || 'https://api.yourecommerce.com'}/track/click', JSON.stringify({
          url: link.href,
          timestamp: Date.now()
        }));
      }
    });
  })();
</script>
<!-- End Tracking Pixel -->
    `.trim();
  }

  // ==================== ANALYTICS CALCULATION METHODS ====================
  
  analyzeGeographicData(clicks) {
    const countries = {};
    const cities = {};
    
    clicks.forEach(click => {
      if (click.location) {
        const country = click.location.country_code || 'Unknown';
        const city = click.location.city || 'Unknown';
        
        countries[country] = (countries[country] || 0) + 1;
        cities[city] = (cities[city] || 0) + 1;
      }
    });
    
    return {
      countries: Object.entries(countries)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count),
      cities: Object.entries(cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 cities
    };
  }

  analyzeDeviceData(clicks) {
    const devices = { mobile: 0, tablet: 0, desktop: 0 };
    const browsers = {};
    const os = {};
    
    clicks.forEach(click => {
      if (click.device) {
        if (click.device.isMobile) devices.mobile += 1;
        else if (click.device.isTablet) devices.tablet += 1;
        else devices.desktop += 1;
        
        if (click.device.browser) {
          browsers[click.device.browser] = (browsers[click.device.browser] || 0) + 1;
        }
        
        if (click.device.os) {
          os[click.device.os] = (os[click.device.os] || 0) + 1;
        }
      }
    });
    
    return {
      devices,
      browsers: Object.entries(browsers)
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count),
      operatingSystems: Object.entries(os)
        .map(([os, count]) => ({ os, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  analyzeHourlyActivity(clicks) {
    const hourly = Array(24).fill(0);
    
    clicks.forEach(click => {
      const hour = new Date(click.timestamp).getHours();
      hourly[hour] += 1;
    });
    
    return hourly.map((count, hour) => ({
      hour,
      count,
      percentage: clicks.length > 0 ? (count / clicks.length) * 100 : 0
    }));
  }

  analyzeReferrers(clicks) {
    const referrers = {};
    
    clicks.forEach(click => {
      const ref = click.referrer || 'direct';
      referrers[ref] = (referrers[ref] || 0) + 1;
    });
    
    return Object.entries(referrers)
      .map(([referrer, count]) => ({
        referrer: referrer === 'direct' ? 'Direct Traffic' : referrer,
        count,
        percentage: clicks.length > 0 ? (count / clicks.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 referrers
  }

  analyzeUTMParameters(clicks, conversions) {
    const utmData = {};
    
    clicks.forEach(click => {
      const key = `${click.utmSource || 'none'}-${click.utmMedium || 'none'}-${click.utmCampaign || 'none'}`;
      
      if (!utmData[key]) {
        utmData[key] = {
          source: click.utmSource || 'none',
          medium: click.utmMedium || 'none',
          campaign: click.utmCampaign || 'none',
          clicks: 0,
          conversions: 0
        };
      }
      
      utmData[key].clicks += 1;
    });
    
    conversions.forEach(conversion => {
      const click = clicks.find(c => c.sessionId === conversion.sessionId);
      if (click) {
        const key = `${click.utmSource || 'none'}-${click.utmMedium || 'none'}-${click.utmCampaign || 'none'}`;
        if (utmData[key]) {
          utmData[key].conversions += 1;
        }
      }
    });
    
    return Object.values(utmData)
      .map(data => ({
        ...data,
        conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate);
  }

  calculateCTR(trackingLink) {
    // For display ads or email campaigns, this would be calculated differently
    // Here we're using a simplified version
    return trackingLink.totalClicks > 0 ? 
      (trackingLink.totalConversions / trackingLink.totalClicks) * 100 : 0;
  }

  calculateEngagementRate(trackingLink) {
    // Simplified engagement rate calculation
    const sessionsWithMultipleClicks = trackingLink.sessions.filter(
      s => s.clickCount > 1
    ).length;
    
    return trackingLink.sessions.length > 0 ? 
      (sessionsWithMultipleClicks / trackingLink.sessions.length) * 100 : 0;
  }

  calculateBounceRate(trackingLink) {
    // Sessions with only one click are considered bounces
    const bouncedSessions = trackingLink.sessions.filter(
      s => s.clickCount === 1 && s.conversions.length === 0
    ).length;
    
    return trackingLink.sessions.length > 0 ? 
      (bouncedSessions / trackingLink.sessions.length) * 100 : 0;
  }

  calculateReturnVisitorRate(trackingLink) {
    // Simplified return visitor calculation
    const uniqueUsers = new Set(
      trackingLink.sessions
        .map(s => s.userId)
        .filter(id => id)
    );
    
    const totalSessions = trackingLink.sessions.length;
    const uniqueVisitorCount = uniqueUsers.size;
    
    return uniqueVisitorCount > 0 ? 
      ((totalSessions - uniqueVisitorCount) / uniqueVisitorCount) * 100 : 0;
  }

  getTopSessions(trackingLink) {
    return trackingLink.sessions
      .sort((a, b) => b.clickCount - a.clickCount)
      .slice(0, 10)
      .map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        clickCount: session.clickCount,
        conversionCount: session.conversions?.length || 0,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt
      }));
  }

  analyzeConversionFunnel(trackingLink) {
    const funnel = {
      clicks: trackingLink.totalClicks,
      sessions: trackingLink.sessions.length,
      engagedSessions: trackingLink.sessions.filter(s => s.clickCount > 1).length,
      conversionSessions: trackingLink.sessions.filter(s => s.conversions?.length > 0).length,
      conversions: trackingLink.totalConversions
    };
    
    return {
      ...funnel,
      clickToSessionRate: funnel.clicks > 0 ? (funnel.sessions / funnel.clicks) * 100 : 0,
      sessionToEngagedRate: funnel.sessions > 0 ? (funnel.engagedSessions / funnel.sessions) * 100 : 0,
      engagedToConversionRate: funnel.engagedSessions > 0 ? (funnel.conversionSessions / funnel.engagedSessions) * 100 : 0,
      overallConversionRate: funnel.clicks > 0 ? (funnel.conversions / funnel.clicks) * 100 : 0
    };
  }
}

module.exports = new LinkService();