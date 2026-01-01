// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

/**
 * Email service class
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = {};
    this.initializeTransporter();
    this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter error:', error);
        } else {
          console.log('Email service is ready to send messages');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  /**
   * Load email templates
   */
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Create templates directory if it doesn't exist
      await fs.mkdir(templatesDir, { recursive: true });
      
      const templateFiles = await fs.readdir(templatesDir);
      
      for (const file of templateFiles) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          
          this.templates[templateName] = handlebars.compile(templateContent);
          console.log(`Loaded email template: ${templateName}`);
        }
      }
      
      // Create default templates if they don't exist
      await this.createDefaultTemplates(templatesDir);
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  }

  /**
   * Create default email templates
   */
  async createDefaultTemplates(templatesDir) {
    const defaultTemplates = {
      'welcome': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to {{appName}}!</h1>
        </div>
        <div class="content">
            <h2>Hello {{name}},</h2>
            <p>Thank you for joining {{appName}}. We're excited to have you on board!</p>
            
            {{#if isSeller}}
            <p>As a seller, you can now:</p>
            <ul>
                <li>List your products</li>
                <li>Manage your store</li>
                <li>Track your sales</li>
                <li>Boost product visibility</li>
            </ul>
            {{/if}}
            
            {{#if isAffiliate}}
            <p>As an affiliate, you can now:</p>
            <ul>
                <li>Generate referral links</li>
                <li>Earn commissions</li>
                <li>Track your performance</li>
                <li>Withdraw your earnings</li>
            </ul>
            {{/if}}
            
            <p>Get started by exploring your dashboard:</p>
            <p style="text-align: center;">
                <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
            </p>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The {{appName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>{{appName}} | {{companyAddress}}</p>
        </div>
    </div>
</body>
</html>
      `,

      'order-confirmation': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .order-item:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Order #{{orderNumber}}</p>
        </div>
        <div class="content">
            <h2>Thank you for your order, {{name}}!</h2>
            <p>Your order has been received and is being processed.</p>
            
            <div class="order-details">
                <h3>Order Summary</h3>
                {{#each items}}
                <div class="order-item">
                    <span>{{this.name}} × {{this.quantity}}</span>
                    <span>{{this.formattedPrice}}</span>
                </div>
                {{/each}}
                
                <div class="order-item">
                    <span>Subtotal</span>
                    <span>{{formattedSubtotal}}</span>
                </div>
                
                {{#if shippingCost}}
                <div class="order-item">
                    <span>Shipping</span>
                    <span>{{formattedShipping}}</span>
                </div>
                {{/if}}
                
                {{#if tax}}
                <div class="order-item">
                    <span>Tax</span>
                    <span>{{formattedTax}}</span>
                </div>
                {{/if}}
                
                <div class="total">
                    <span>Total: {{formattedTotal}}</span>
                </div>
            </div>
            
            <p><strong>Shipping Address:</strong><br>
            {{shippingAddress.name}}<br>
            {{shippingAddress.street}}<br>
            {{shippingAddress.city}}, {{shippingAddress.state}} {{shippingAddress.postalCode}}<br>
            {{shippingAddress.country}}</p>
            
            <p>Estimated Delivery: {{estimatedDelivery}}</p>
            
            <p style="text-align: center;">
                <a href="{{orderUrl}}" class="button">View Order Details</a>
            </p>
            
            <p>You will receive another email when your order ships.</p>
            
            <p>Best regards,<br>The {{appName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>{{appName}} | {{companyAddress}}</p>
        </div>
    </div>
</body>
</html>
      `,

      'password-reset': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <h2>Hello {{name}},</h2>
            <p>We received a request to reset your password for your {{appName}} account.</p>
            
            <div class="warning">
                <p><strong>Note:</strong> This password reset link will expire in 10 minutes.</p>
            </div>
            
            <p>Click the button below to reset your password:</p>
            
            <p style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">{{resetUrl}}</p>
            
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            
            <p>Best regards,<br>The {{appName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>{{appName}} | {{companyAddress}}</p>
        </div>
    </div>
</body>
</html>
      `,

      'affiliate-welcome': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Affiliate Program - {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .stat-box { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 14px; color: #666; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Our Affiliate Program!</h1>
        </div>
        <div class="content">
            <h2>Congratulations, {{name}}!</h2>
            <p>You're now part of the {{appName}} affiliate program. Get ready to start earning commissions!</p>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-value">20%</div>
                    <div class="stat-label">Commission Rate</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">$50</div>
                    <div class="stat-label">Minimum Payout</div>
                </div>
            </div>
            
            <p><strong>Your Affiliate Code:</strong> <code style="background: #eee; padding: 5px 10px; border-radius: 3px; font-size: 18px;">{{affiliateCode}}</code></p>
            
            <p>Start sharing your affiliate links and earn commissions on every sale you refer.</p>
            
            <p><strong>Quick Start Guide:</strong></p>
            <ol>
                <li>Generate affiliate links from your dashboard</li>
                <li>Share them on social media, blogs, or with friends</li>
                <li>Track your clicks, conversions, and earnings</li>
                <li>Request withdrawal when you reach $50</li>
            </ol>
            
            <p style="text-align: center;">
                <a href="{{dashboardUrl}}" class="button">Go to Affiliate Dashboard</a>
            </p>
            
            <p>Need help getting started? Check out our <a href="{{guideUrl}}">Affiliate Guide</a> or contact our support team.</p>
            
            <p>Best regards,<br>The {{appName}} Affiliate Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>{{appName}} | {{companyAddress}}</p>
        </div>
    </div>
</body>
</html>
      `,

      'boost-confirmation': `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boost Confirmation - {{appName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .boost-details { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Boost Purchase Confirmed!</h1>
            <p>Your product is now boosted</p>
        </div>
        <div class="content">
            <h2>Great news, {{name}}!</h2>
            <p>Your boost purchase has been confirmed and your product is now featured.</p>
            
            <div class="boost-details">
                <h3>Boost Details</h3>
                
                <div class="detail-row">
                    <span>Product</span>
                    <span><strong>{{productName}}</strong></span>
                </div>
                
                <div class="detail-row">
                    <span>Boost Type</span>
                    <span>{{boostType}}</span>
                </div>
                
                <div class="detail-row">
                    <span>Duration</span>
                    <span>{{duration}}</span>
                </div>
                
                <div class="detail-row">
                    <span>Start Date</span>
                    <span>{{startDate}}</span>
                </div>
                
                <div class="detail-row">
                    <span>End Date</span>
                    <span>{{endDate}}</span>
                </div>
                
                <div class="detail-row">
                    <span>Cost</span>
                    <span>{{formattedCost}}</span>
                </div>
                
                <div class="total">
                    <span>Total Paid: {{formattedTotal}}</span>
                </div>
            </div>
            
            <p><strong>Boost Benefits:</strong></p>
            <ul>
                <li>Top placement in search results</li>
                <li>Featured on homepage</li>
                <li>Increased visibility</li>
                <li>Higher conversion rates</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="{{productUrl}}" class="button">View Boosted Product</a>
            </p>
            
            <p>Track your boost performance in your seller dashboard.</p>
            
            <p>Best regards,<br>The {{appName}} Team</p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} {{appName}}. All rights reserved.</p>
            <p>{{appName}} | {{companyAddress}}</p>
        </div>
    </div>
</body>
</html>
      `
    };

    for (const [name, template] of Object.entries(defaultTemplates)) {
      if (!this.templates[name]) {
        const templatePath = path.join(templatesDir, `${name}.hbs`);
        await fs.writeFile(templatePath, template.trim());
        this.templates[name] = handlebars.compile(template);
        console.log(`Created default template: ${name}`);
      }
    }
  }

  /**
   * Send email
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return false;
      }

      const {
        to,
        subject,
        template,
        data = {},
        attachments = [],
        replyTo,
        cc,
        bcc
      } = options;

      // Default template data
      const templateData = {
        ...data,
        appName: process.env.APP_NAME || 'E-Commerce Pro',
        companyAddress: process.env.COMPANY_ADDRESS || '123 Business St, City, Country',
        year: new Date().getFullYear(),
        currentDate: new Date().toLocaleDateString()
      };

      // Get HTML content from template
      let html;
      if (template && this.templates[template]) {
        html = this.templates[template](templateData);
      } else {
        html = options.html || `<p>${options.text || 'No content'}</p>`;
      }

      // Email options
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments,
        replyTo: replyTo || process.env.EMAIL_REPLY_TO,
        cc,
        bcc
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent to ${to}: ${info.messageId}`);
      
      // Log email sending for analytics
      await this.logEmailSent({
        to,
        subject,
        template,
        messageId: info.messageId,
        timestamp: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Log email failure
      await this.logEmailFailure({
        to: options.to,
        subject: options.subject,
        error: error.message,
        timestamp: new Date()
      });
      
      return false;
    }
  }

  /**
   * Log email sent
   */
  async logEmailSent(data) {
    try {
      // In production, you would save this to a database
      // For now, just log to console
      console.log('Email logged:', data);
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  /**
   * Log email failure
   */
  async logEmailFailure(data) {
    try {
      console.error('Email failed:', data);
    } catch (error) {
      console.error('Error logging email failure:', error);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user, options = {}) {
    const { isSeller = false, isAffiliate = false } = options;
    
    return this.sendEmail({
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME || 'Our Platform'}!`,
      template: 'welcome',
      data: {
        name: user.name,
        isSeller,
        isAffiliate,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
      }
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'verification',
      data: {
        name: user.name,
        verificationUrl,
        expiryHours: 24
      }
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl
      }
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Order Confirmation #${order.orderNumber}`,
      template: 'order-confirmation',
      data: {
        name: user.name,
        orderNumber: order.orderNumber,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          formattedPrice: `$${item.price.toFixed(2)}`
        })),
        formattedSubtotal: `$${order.subtotal.toFixed(2)}`,
        formattedShipping: `$${order.shippingFee.toFixed(2)}`,
        formattedTax: `$${order.taxAmount.toFixed(2)}`,
        formattedTotal: `$${order.totalAmount.toFixed(2)}`,
        shippingAddress: order.shipping.address,
        estimatedDelivery: order.shipping.estimatedDelivery?.toLocaleDateString() || '3-5 business days',
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`
      }
    });
  }

  /**
   * Send affiliate welcome email
   */
  async sendAffiliateWelcomeEmail(user, affiliateCode) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Our Affiliate Program!',
      template: 'affiliate-welcome',
      data: {
        name: user.name,
        affiliateCode,
        dashboardUrl: `${process.env.FRONTEND_URL}/affiliate/dashboard`,
        guideUrl: `${process.env.FRONTEND_URL}/affiliate/guide`
      }
    });
  }

  /**
   * Send boost confirmation email
   */
  async sendBoostConfirmation(user, boost, product) {
    return this.sendEmail({
      to: user.email,
      subject: 'Boost Purchase Confirmed',
      template: 'boost-confirmation',
      data: {
        name: user.name,
        productName: product.name,
        boostType: boost.boostType,
        duration: `${boost.duration} ${boost.durationUnit}`,
        startDate: boost.startDate.toLocaleDateString(),
        endDate: boost.endDate.toLocaleDateString(),
        formattedCost: `$${boost.cost.toFixed(2)}`,
        formattedTotal: `$${boost.cost.toFixed(2)}`,
        productUrl: `${process.env.FRONTEND_URL}/product/${product.slug}`
      }
    });
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(payment, user) {
    return this.sendEmail({
      to: user.email,
      subject: `Payment Receipt - ${payment.paymentId}`,
      template: 'payment-receipt',
      data: {
        name: user.name,
        paymentId: payment.paymentId,
        amount: `$${payment.amount.toFixed(2)}`,
        currency: payment.currency,
        method: payment.method,
        date: payment.createdAt.toLocaleDateString(),
        transactionId: payment.gateway?.transactionId || payment.paymentId,
        receiptUrl: `${process.env.FRONTEND_URL}/payments/${payment._id}/receipt`
      }
    });
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(subject, message, type = 'info') {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    if (!adminEmail) {
      console.warn('Admin email not configured');
      return false;
    }
    
    return this.sendEmail({
      to: adminEmail,
      subject: `[${type.toUpperCase()}] ${subject}`,
      template: 'admin-notification',
      data: {
        subject,
        message,
        type,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send bulk emails (for newsletters, promotions)
   */
  async sendBulkEmails(recipients, subject, template, data) {
    const results = {
      sent: 0,
      failed: 0,
      details: []
    };
    
    for (const recipient of recipients) {
      try {
        const success = await this.sendEmail({
          to: recipient.email,
          subject,
          template,
          data: {
            ...data,
            name: recipient.name
          }
        });
        
        if (success) {
          results.sent++;
          results.details.push({
            email: recipient.email,
            status: 'sent',
            timestamp: new Date()
          });
        } else {
          results.failed++;
          results.details.push({
            email: recipient.email,
            status: 'failed',
            timestamp: new Date()
          });
        }
        
        // Rate limiting: wait 100ms between emails
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.details.push({
          email: recipient.email,
          status: 'error',
          error: error.message,
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(startDate, endDate) {
    // In production, you would query from database
    // This is a mock implementation
    return {
      totalSent: 0,
      totalFailed: 0,
      byTemplate: {},
      byDay: {},
      successRate: 0
    };
  }

  /**
   * Test email service
   */
  async testEmailService() {
    try {
      const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER;
      
      if (!testEmail) {
        throw new Error('Test email not configured');
      }
      
      const result = await this.sendEmail({
        to: testEmail,
        subject: 'Test Email from E-Commerce Platform',
        template: 'welcome',
        data: {
          name: 'Test User',
          dashboardUrl: process.env.FRONTEND_URL
        }
      });
      
      return {
        success: result,
        message: result ? 'Test email sent successfully' : 'Failed to send test email'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;