const nodemailer = require('nodemailer');
const axios = require('axios');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

class NotificationService {
  constructor() {
    // Email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // SMS configuration
    this.smsConfig = {
      enabled: process.env.SMS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      apiKey: process.env.SMS_API_KEY,
      fromNumber: process.env.SMS_FROM_NUMBER
    };

    // Push notification configuration
    this.pushConfig = {
      enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
    };
  }

  // ==================== EMAIL NOTIFICATIONS ====================
  
  /**
   * Send email notification
   */
  async sendEmail(to, subject, template, data = {}) {
    try {
      if (!this.transporter) {
        console.warn('Email transporter not configured');
        return false;
      }

      const html = this.renderEmailTemplate(template, data);
      const text = this.stripHtml(html);

      const mailOptions = {
        from: `"E-Commerce Pro Platform" <${process.env.EMAIL_FROM || 'noreply@yourecommerce.com'}>`,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      
      // Log notification
      await this.logNotification({
        type: 'email',
        recipient: to,
        subject,
        template,
        data,
        status: 'sent',
        messageId: info.messageId
      });
      
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      
      // Log failed notification
      await this.logNotification({
        type: 'email',
        recipient: to,
        subject,
        template,
        data,
        status: 'failed',
        error: error.message
      });
      
      return false;
    }
  }

  /**
   * Render email template
   */
  renderEmailTemplate(template, data) {
    const templates = {
      welcome: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to E-Commerce Pro Platform</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to E-Commerce Pro Platform! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Welcome to the world's most advanced e-commerce marketplace! We're thrilled to have you on board.</p>
              <p>Your account has been successfully created with the following details:</p>
              <ul>
                <li><strong>Email:</strong> ${data.email}</li>
                <li><strong>Account Type:</strong> ${data.accountType || 'Buyer'}</li>
                <li><strong>Joined:</strong> ${new Date().toLocaleDateString()}</li>
              </ul>
              ${data.sellerInfo ? `
              <h3>Seller Benefits:</h3>
              <ul>
                <li>Reach millions of potential buyers</li>
                <li>Boost your products for better visibility</li>
                <li>Earn through affiliate marketing</li>
                <li>24/7 customer support</li>
              </ul>
              ` : ''}
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/dashboard" class="button">Go to Dashboard</a>
              </center>
              <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/help">help center</a> or contact our support team.</p>
              <p>Happy selling (and shopping)!</p>
              <p><strong>The E-Commerce Pro Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
              <p>This email was sent to ${data.email}. If you didn't create an account, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      orderConfirmation: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - #${data.orderId}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-size: 18px; font-weight: bold; color: #4CAF50; margin-top: 20px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed! ✅</h1>
              <p>Order #${data.orderId}</p>
            </div>
            <div class="content">
              <p>Hi ${data.customerName},</p>
              <p>Thank you for your order! We've received it and are processing it now.</p>
              
              <div class="order-details">
                <h3>Order Summary</h3>
                ${data.items ? data.items.map(item => `
                  <div class="product-item">
                    <strong>${item.name}</strong><br>
                    Quantity: ${item.quantity} × $${item.price} = $${(item.quantity * item.price).toFixed(2)}
                  </div>
                `).join('') : ''}
                
                <div class="total">
                  Total Amount: $${data.totalAmount}<br>
                  <small>Payment Method: ${data.paymentMethod}</small>
                </div>
              </div>
              
              <h3>Shipping Information</h3>
              <p>
                ${data.shippingAddress?.name || ''}<br>
                ${data.shippingAddress?.street || ''}<br>
                ${data.shippingAddress?.city || ''}, ${data.shippingAddress?.state || ''} ${data.shippingAddress?.zip || ''}<br>
                ${data.shippingAddress?.country || ''}
              </p>
              
              <h3>What's Next?</h3>
              <ul>
                <li>We'll notify you when your order ships</li>
                <li>Estimated delivery: ${data.estimatedDelivery || '3-5 business days'}</li>
                <li>Track your order anytime from your dashboard</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/orders/${data.orderId}" class="button">View Order Details</a>
              </center>
              
              <p>Questions about your order? <a href="mailto:support@yourecommerce.com">Contact our support team</a>.</p>
              
              <p>Thank you for shopping with us!</p>
              <p><strong>The E-Commerce Pro Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
              <p>This email was sent regarding your recent order.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      paymentReceived: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received - #${data.paymentId}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .payment-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Received! 💰</h1>
              <p>Transaction #${data.paymentId}</p>
            </div>
            <div class="content">
              <p>Hi ${data.recipientName},</p>
              <p>Great news! We've received a payment in your account.</p>
              
              <div class="payment-details">
                <div class="amount">$${data.amount}</div>
                <p><strong>Payment Details:</strong></p>
                <ul>
                  <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
                  <li><strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}</li>
                  <li><strong>Payment Method:</strong> ${data.paymentMethod}</li>
                  <li><strong>From:</strong> ${data.payerName || 'Customer'}</li>
                  ${data.orderId ? `<li><strong>Order:</strong> #${data.orderId}</li>` : ''}
                </ul>
              </div>
              
              ${data.isSeller ? `
              <h3>Seller Information</h3>
              <ul>
                <li>Platform fee (8%): $${(data.amount * 0.08).toFixed(2)}</li>
                <li>Your earnings: $${(data.amount * 0.92).toFixed(2)}</li>
                <li>Funds will be available for withdrawal in 3-5 business days</li>
              </ul>
              ` : ''}
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/dashboard/revenue" class="button">View Revenue Dashboard</a>
              </center>
              
              <p>Need help with this transaction? <a href="mailto:support@yourecommerce.com">Contact support</a>.</p>
              
              <p>Thank you for using E-Commerce Pro Platform!</p>
              <p><strong>The E-Commerce Pro Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      boostConfirmation: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Boost Activated - ${data.productName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF9800 0%, #FF5722 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .boost-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .badge { display: inline-block; background: #FF9800; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px; }
            .button { display: inline-block; background: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Product Boost Activated! 🚀</h1>
              <p>Your product is now featured on the platform</p>
            </div>
            <div class="content">
              <p>Hi ${data.sellerName},</p>
              <p>Your product boost has been successfully activated! Your product will now receive premium visibility across the platform.</p>
              
              <div class="boost-details">
                <h3>Boost Details</h3>
                <p><strong>Product:</strong> ${data.productName}</p>
                <p><strong>Boost Duration:</strong> ${data.duration} (${data.startDate} to ${data.endDate})</p>
                <p><strong>Boost Level:</strong> <span class="badge">${data.boostLevel || 'Premium'}</span></p>
                <p><strong>Amount Paid:</strong> $${data.amount}</p>
                <p><strong>Expected Benefits:</strong></p>
                <ul>
                  <li>Top placement in search results</li>
                  <li>Featured in homepage carousel</li>
                  <li>Priority in category listings</li>
                  <li>Higher conversion rates</li>
                </ul>
              </div>
              
              <h3>Boost Performance Tips</h3>
              <ul>
                <li>Make sure your product images are high-quality</li>
                <li>Keep your product description detailed and engaging</li>
                <li>Monitor your product performance in the seller dashboard</li>
                <li>Consider extending the boost if you get good results</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/products/${data.productId}" class="button">View Boosted Product</a>
              </center>
              
              <p>Need help optimizing your product? <a href="mailto:support@yourecommerce.com">Contact our seller support team</a>.</p>
              
              <p>Happy selling!</p>
              <p><strong>The E-Commerce Pro Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      affiliateCommission: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Affiliate Commission Earned - $${data.commissionAmount}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9C27B0 0%, #673AB7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .commission-details { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #9C27B0; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #9C27B0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Commission Earned! 💸</h1>
              <p>You've earned an affiliate commission</p>
            </div>
            <div class="content">
              <p>Hi ${data.affiliateName},</p>
              <p>Congratulations! You've earned a commission from your affiliate marketing efforts.</p>
              
              <div class="commission-details">
                <div class="amount">$${data.commissionAmount}</div>
                <p><strong>Commission Details:</strong></p>
                <ul>
                  <li><strong>Referral:</strong> ${data.referredCustomer}</li>
                  <li><strong>Order:</strong> #${data.orderId}</li>
                  <li><strong>Order Total:</strong> $${data.orderAmount}</li>
                  <li><strong>Commission Rate:</strong> ${data.commissionRate}%</li>
                  <li><strong>Date Earned:</strong> ${new Date().toLocaleDateString()}</li>
                </ul>
              </div>
              
              <h3>Your Affiliate Summary</h3>
              <ul>
                <li><strong>Total Commissions:</strong> $${data.totalCommissions || '0.00'}</li>
                <li><strong>Pending Withdrawal:</strong> $${data.pendingWithdrawal || '0.00'}</li>
                <li><strong>Available Balance:</strong> $${data.availableBalance || '0.00'}</li>
                ${data.isWithdrawable ? `<li><strong>Status:</strong> Ready for withdrawal (minimum $50)</li>` : ''}
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/affiliate/dashboard" class="button">Go to Affiliate Dashboard</a>
              </center>
              
              <h3>Tips to Earn More</h3>
              <ul>
                <li>Share your unique affiliate link on social media</li>
                <li>Create product reviews and unboxing videos</li>
                <li>Join our affiliate marketing community</li>
                <li>Use our promotional materials in your content</li>
              </ul>
              
              <p>Keep up the great work!</p>
              <p><strong>The E-Commerce Pro Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,

      passwordReset: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F44336 0%, #E91E63 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reset-code { background: white; border: 2px dashed #F44336; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #F44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #FFF3CD; border: 1px solid #FFEAA7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
              <p>Follow the instructions below to reset your password</p>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>We received a request to reset your password for your E-Commerce Pro Platform account.</p>
              
              <div class="reset-code">
                ${data.resetToken || 'RESET-CODE'}
              </div>
              
              <div class="warning">
                <p><strong>Important:</strong> This password reset link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
              </div>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/reset-password?token=${data.resetToken}" class="button">Reset Password</a>
              </center>
              
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">
                ${process.env.FRONTEND_URL || 'https://yourecommerce.com'}/reset-password?token=${data.resetToken}
              </p>
              
              <p>Need help? <a href="mailto:support@yourecommerce.com">Contact our support team</a>.</p>
              
              <p>Stay secure,</p>
              <p><strong>The E-Commerce Pro Security Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} E-Commerce Pro Platform. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    return templates[template] || `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <h1>${subject}</h1>
        <p>${JSON.stringify(data, null, 2)}</p>
      </body>
      </html>
    `;
  }

  /**
   * Strip HTML tags for plain text email
   */
  stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==================== SMS NOTIFICATIONS ====================
  
  /**
   * Send SMS notification
   */
  async sendSMS(to, message) {
    try {
      if (!this.smsConfig.enabled) {
        console.warn('SMS notifications are disabled');
        return false;
      }

      let response;
      
      switch (this.smsConfig.provider) {
        case 'twilio':
          response = await axios.post(
            'https://api.twilio.com/2010-04-01/Accounts/ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/Messages.json',
            new URLSearchParams({
              To: to,
              From: this.smsConfig.fromNumber,
              Body: message
            }),
            {
              auth: {
                username: this.smsConfig.apiKey,
                password: process.env.SMS_API_SECRET
              }
            }
          );
          break;

        case 'africastalking':
          response = await axios.post(
            'https://api.africastalking.com/version1/messaging',
            new URLSearchParams({
              username: process.env.SMS_USERNAME,
              to: to,
              message: message,
              from: this.smsConfig.fromNumber
            }),
            {
              headers: {
                'apiKey': this.smsConfig.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
          break;

        default:
          console.warn(`SMS provider ${this.smsConfig.provider} not implemented`);
          return false;
      }

      console.log('SMS sent:', response.data);
      
      // Log notification
      await this.logNotification({
        type: 'sms',
        recipient: to,
        message,
        status: 'sent',
        provider: this.smsConfig.provider
      });
      
      return true;
    } catch (error) {
      console.error('SMS sending error:', error);
      
      // Log failed notification
      await this.logNotification({
        type: 'sms',
        recipient: to,
        message,
        status: 'failed',
        error: error.message,
        provider: this.smsConfig.provider
      });
      
      return false;
    }
  }

  // ==================== PUSH NOTIFICATIONS ====================
  
  /**
   * Send push notification
   */
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      if (!this.pushConfig.enabled) {
        console.warn('Push notifications are disabled');
        return false;
      }

      // Get user's push subscription
      const user = await User.findById(userId);
      if (!user || !user.pushSubscription) {
        console.log('User has no push subscription');
        return false;
      }

      // In production, you would use web-push library
      // For now, we'll simulate it
      console.log(`Push notification to ${userId}: ${title} - ${body}`);
      
      // Log notification
      await this.logNotification({
        type: 'push',
        recipient: userId,
        title,
        body,
        data,
        status: 'sent'
      });
      
      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      
      // Log failed notification
      await this.logNotification({
        type: 'push',
        recipient: userId,
        title,
        body,
        data,
        status: 'failed',
        error: error.message
      });
      
      return false;
    }
  }

  // ==================== SYSTEM NOTIFICATIONS ====================
  
  /**
   * Send system notification (in-app)
   */
  async sendSystemNotification(userId, type, title, message, data = {}) {
    try {
      // Add notification to user's notification array
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            type,
            title,
            message,
            data,
            isRead: false,
            createdAt: new Date()
          }
        }
      });
      
      // Log notification
      await this.logNotification({
        type: 'system',
        recipient: userId,
        title,
        message,
        data,
        status: 'sent'
      });
      
      return true;
    } catch (error) {
      console.error('System notification error:', error);
      
      // Log failed notification
      await this.logNotification({
        type: 'system',
        recipient: userId,
        title,
        message,
        data,
        status: 'failed',
        error: error.message
      });
      
      return false;
    }
  }

  // ==================== SPECIFIC NOTIFICATION TYPES ====================
  
  /**
   * Send welcome notification to new user
   */
  async sendWelcomeNotification(user) {
    const promises = [];
    
    // Email
    if (user.email) {
      promises.push(
        this.sendEmail(user.email, 'Welcome to E-Commerce Pro Platform!', 'welcome', {
          name: user.name,
          email: user.email,
          accountType: user.userType,
          sellerInfo: user.userType === 'seller'
        })
      );
    }
    
    // SMS for mobile number
    if (user.mobileNumber && user.mobileNumber.startsWith('254')) {
      const message = `Welcome to E-Commerce Pro! Your account ${user.email} is ready. Start selling/shopping at ${process.env.FRONTEND_URL || 'yourecommerce.com'}`;
      promises.push(this.sendSMS(user.mobileNumber, message));
    }
    
    // System notification
    promises.push(
      this.sendSystemNotification(
        user._id,
        'welcome',
        'Welcome to E-Commerce Pro Platform! 🎉',
        'Your account has been successfully created. Complete your profile to get started.',
        { action: 'complete_profile' }
      )
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Send order confirmation to buyer
   */
  async sendOrderConfirmation(order) {
    const user = await User.findById(order.user);
    if (!user) return;
    
    const items = order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Email
    await this.sendEmail(user.email, `Order Confirmation - #${order.orderNumber}`, 'orderConfirmation', {
      customerName: user.name,
      orderId: order.orderNumber,
      items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      estimatedDelivery: '3-5 business days'
    });
    
    // System notification
    await this.sendSystemNotification(
      user._id,
      'order_confirmation',
      'Order Confirmed! ✅',
      `Your order #${order.orderNumber} has been confirmed. Total: $${order.totalAmount}`,
      { orderId: order._id, action: 'view_order' }
    );
  }

  /**
   * Send payment notification to seller
   */
  async sendPaymentNotificationToSeller(order, sellerId) {
    const seller = await User.findById(sellerId);
    if (!seller) return;
    
    // Calculate seller earnings (after 8% platform fee)
    const sellerEarnings = order.totalAmount * 0.92;
    
    // Email
    await this.sendEmail(seller.email, `Payment Received - $${sellerEarnings.toFixed(2)}`, 'paymentReceived', {
      recipientName: seller.name,
      amount: sellerEarnings.toFixed(2),
      paymentId: order.payment?.toString() || order._id.toString(),
      transactionId: order.transactionId,
      paymentMethod: order.paymentMethod,
      orderId: order.orderNumber,
      payerName: order.user?.name || 'Customer',
      isSeller: true,
      timestamp: order.updatedAt
    });
    
    // System notification
    await this.sendSystemNotification(
      seller._id,
      'payment_received',
      'Payment Received! 💰',
      `You've received $${sellerEarnings.toFixed(2)} from order #${order.orderNumber}`,
      { 
        orderId: order._id, 
        amount: sellerEarnings,
        action: 'view_earnings' 
      }
    );
  }

  /**
   * Send boost confirmation to seller
   */
  async sendBoostConfirmation(boost, product) {
    const seller = await User.findById(boost.user);
    if (!seller) return;
    
    await this.sendEmail(seller.email, `Product Boost Activated - ${product.name}`, 'boostConfirmation', {
      sellerName: seller.name,
      productName: product.name,
      productId: product._id,
      duration: boost.duration,
      startDate: boost.startDate.toLocaleDateString(),
      endDate: boost.endDate.toLocaleDateString(),
      amount: boost.amount,
      boostLevel: 'Premium'
    });
    
    // System notification
    await this.sendSystemNotification(
      seller._id,
      'boost_activated',
      'Product Boost Activated! 🚀',
      `Your product "${product.name}" is now boosted for ${boost.duration}`,
      { 
        productId: product._id,
        boostId: boost._id,
        action: 'view_product' 
      }
    );
  }

  /**
   * Send affiliate commission notification
   */
  async sendAffiliateCommission(affiliateId, commissionData) {
    const affiliate = await User.findById(affiliateId);
    if (!affiliate) return;
    
    // Get total commissions
    const totalCommissions = await this.calculateTotalCommissions(affiliateId);
    
    await this.sendEmail(affiliate.email, `Affiliate Commission Earned - $${commissionData.amount}`, 'affiliateCommission', {
      affiliateName: affiliate.name,
      commissionAmount: commissionData.amount.toFixed(2),
      referredCustomer: commissionData.referredCustomer || 'New Customer',
      orderId: commissionData.orderId,
      orderAmount: commissionData.orderAmount?.toFixed(2) || '0.00',
      commissionRate: '20',
      totalCommissions: totalCommissions.toFixed(2),
      pendingWithdrawal: '0.00', // Would calculate from withdrawal requests
      availableBalance: totalCommissions.toFixed(2),
      isWithdrawable: totalCommissions >= 50
    });
    
    // System notification
    await this.sendSystemNotification(
      affiliate._id,
      'commission_earned',
      'Commission Earned! 💸',
      `You've earned $${commissionData.amount.toFixed(2)} from affiliate referral`,
      { 
        commissionId: commissionData._id,
        amount: commissionData.amount,
        action: 'view_commissions' 
      }
    );
  }

  /**
   * Send password reset notification
   */
  async sendPasswordReset(user, resetToken) {
    await this.sendEmail(user.email, 'Reset Your Password', 'passwordReset', {
      name: user.name,
      resetToken
    });
    
    // Optional SMS for mobile
    if (user.mobileNumber && user.mobileNumber.startsWith('254')) {
      const message = `E-Commerce Pro: Password reset code: ${resetToken}. Valid for 1 hour.`;
      await this.sendSMS(user.mobileNumber, message);
    }
  }

  /**
   * Send low stock notification to seller
   */
  async sendLowStockNotification(product, sellerId) {
    const seller = await User.findById(sellerId);
    if (!seller) return;
    
    await this.sendSystemNotification(
      seller._id,
      'low_stock',
      'Low Stock Alert ⚠️',
      `Your product "${product.name}" is running low. Only ${product.stockQuantity} units left.`,
      { 
        productId: product._id,
        stockQuantity: product.stockQuantity,
        action: 'restock_product' 
      }
    );
    
    // Email notification for very low stock
    if (product.stockQuantity <= 5) {
      await this.sendEmail(
        seller.email,
        `Urgent: Low Stock Alert for ${product.name}`,
        'lowStock',
        {
          sellerName: seller.name,
          productName: product.name,
          stockQuantity: product.stockQuantity,
          productId: product._id,
          recommendedAction: 'Restock immediately to avoid lost sales'
        }
      );
    }
  }

  /**
   * Send revenue alert to super admin
   */
  async sendRevenueAlert(alertData) {
    const superAdmin = await User.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
    if (!superAdmin) return;
    
    const subject = `Revenue Alert: ${alertData.type} - ${alertData.message}`;
    const body = `
      <h2>Revenue Alert</h2>
      <p><strong>Type:</strong> ${alertData.type}</p>
      <p><strong>Message:</strong> ${alertData.message}</p>
      <p><strong>Severity:</strong> ${alertData.severity}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      ${alertData.data ? `<pre>${JSON.stringify(alertData.data, null, 2)}</pre>` : ''}
      <p><a href="${process.env.FRONTEND_URL}/admin/revenue">View Revenue Dashboard</a></p>
    `;
    
    await this.sendEmail(superAdmin.email, subject, 'custom', { html: body });
    
    // System notification
    await this.sendSystemNotification(
      superAdmin._id,
      'revenue_alert',
      `Revenue Alert: ${alertData.type}`,
      alertData.message,
      { 
        alertData,
        action: 'view_revenue_dashboard' 
      }
    );
  }

  // ==================== BULK NOTIFICATIONS ====================
  
  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(users, notificationType, data) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };
    
    for (const user of users) {
      try {
        let success = false;
        
        switch (notificationType) {
          case 'promotional':
            success = await this.sendPromotionalNotification(user, data);
            break;
          case 'system_update':
            success = await this.sendSystemUpdateNotification(user, data);
            break;
          case 'feature_announcement':
            success = await this.sendFeatureAnnouncement(user, data);
            break;
          default:
            throw new Error(`Unknown notification type: ${notificationType}`);
        }
        
        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: user._id,
          email: user.email,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Send promotional notification
   */
  async sendPromotionalNotification(user, data) {
    const { subject, message, offerCode, expiryDate } = data;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .offer-code { background: #FFD700; padding: 10px 20px; font-size: 24px; font-weight: bold; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>${subject}</h1>
        <p>Hi ${user.name},</p>
        ${message}
        ${offerCode ? `<div class="offer-code">${offerCode}</div>` : ''}
        ${expiryDate ? `<p><strong>Valid until:</strong> ${expiryDate}</p>` : ''}
        <p><a href="${process.env.FRONTEND_URL}">Shop Now</a></p>
      </body>
      </html>
    `;
    
    return this.sendEmail(user.email, subject, 'custom', { html });
  }

  // ==================== NOTIFICATION LOGGING ====================
  
  /**
   * Log notification for tracking and analytics
   */
  async logNotification(logData) {
    try {
      // In production, save to a notifications log collection
      // For now, we'll just log to console
      console.log('Notification logged:', {
        timestamp: new Date(),
        ...logData
      });
      
      // Here you would save to MongoDB:
      // await NotificationLog.create(logData);
      
      return true;
    } catch (error) {
      console.error('Notification logging error:', error);
      return false;
    }
  }

  /**
   * Calculate total commissions for affiliate
   */
  async calculateTotalCommissions(affiliateId) {
    try {
      // This would query the commission records
      // For now, return a mock value
      return 125.50;
    } catch (error) {
      console.error('Commission calculation error:', error);
      return 0;
    }
  }

  // ==================== NOTIFICATION PREFERENCES ====================
  
  /**
   * Check if user wants to receive a specific notification type
   */
  async checkNotificationPreference(userId, notificationType) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.notificationPreferences) {
        return true; // Default to allowing notifications
      }
      
      const preferences = user.notificationPreferences;
      
      switch (notificationType) {
        case 'email_marketing':
          return preferences.emailMarketing !== false;
        case 'sms_promotions':
          return preferences.smsPromotions !== false;
        case 'order_updates':
          return preferences.orderUpdates !== false;
        case 'price_drops':
          return preferences.priceDrops !== false;
        case 'stock_alerts':
          return preferences.stockAlerts !== false;
        default:
          return true;
      }
    } catch (error) {
      console.error('Notification preference check error:', error);
      return true;
    }
  }

  // ==================== NOTIFICATION TEMPLATE MANAGEMENT ====================
  
  /**
   * Get notification template
   */
  async getNotificationTemplate(templateName, language = 'en') {
    // In production, load from database or file system
    const templates = {
      'en': {
        'order_shipped': {
          subject: 'Your Order Has Shipped!',
          email: 'order_shipped_email',
          sms: 'Your order #{orderNumber} has shipped. Track: {trackingUrl}',
          push: 'Your order has shipped! Track it here.'
        },
        'order_delivered': {
          subject: 'Order Delivered Successfully',
          email: 'order_delivered_email',
          sms: 'Your order #{orderNumber} has been delivered. Rate your experience.',
          push: 'Your order has been delivered!'
        },
        'price_drop': {
          subject: 'Price Drop Alert',
          email: 'price_drop_email',
          sms: 'Price dropped on {productName}! Now ${newPrice} (Was ${oldPrice})',
          push: 'Price drop on {productName}!'
        }
      }
    };
    
    return templates[language]?.[templateName] || null;
  }

  /**
   * Update notification template
   */
  async updateNotificationTemplate(templateName, updates, adminUser) {
    // Verify super admin
    if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
      throw new Error('Unauthorized: Super admin access required');
    }
    
    // In production, save to database
    console.log('Template updated:', templateName, updates);
    return true;
  }

  // ==================== NOTIFICATION ANALYTICS ====================
  
  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(timeframe = '30d', adminUser) {
    try {
      // Verify super admin
      if (adminUser.email !== process.env.SUPER_ADMIN_EMAIL) {
        throw new Error('Unauthorized: Super admin access required');
      }
      
      // In production, query notification logs
      // For now, return mock analytics
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (timeframe === '7d' ? 7 : 30));
      
      return {
        timeframe,
        startDate,
        endDate: now,
        summary: {
          totalNotifications: 1250,
          emailNotifications: 850,
          smsNotifications: 300,
          pushNotifications: 100,
          systemNotifications: 0
        },
        deliveryRates: {
          email: { sent: 850, delivered: 820, opened: 410, clicked: 125 },
          sms: { sent: 300, delivered: 290, read: 250 },
          push: { sent: 100, delivered: 95, opened: 70 }
        },
        popularTemplates: [
          { name: 'order_confirmation', count: 450, openRate: 0.65 },
          { name: 'payment_received', count: 300, openRate: 0.85 },
          { name: 'welcome', count: 200, openRate: 0.90 },
          { name: 'password_reset', count: 100, openRate: 0.95 },
          { name: 'promotional', count: 200, openRate: 0.35 }
        ],
        performance: {
          averageDeliveryTime: '2.5 seconds',
          peakSendingHours: [10, 14, 20], // 10AM, 2PM, 8PM
          mostActiveDay: 'Monday'
        },
        generatedAt: now
      };
    } catch (error) {
      console.error('Notification analytics error:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATION SCHEDULING ====================
  
  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(scheduleData) {
    try {
      const {
        userId,
        type,
        template,
        data,
        sendAt,
        timezone = 'UTC'
      } = scheduleData;
      
      // In production, save to a scheduled notifications collection
      // For now, log it
      console.log('Notification scheduled:', {
        userId,
        type,
        template,
        sendAt: new Date(sendAt),
        timezone,
        scheduledAt: new Date()
      });
      
      return {
        scheduleId: `SCHED-${Date.now()}`,
        sendAt: new Date(sendAt),
        status: 'scheduled'
      };
    } catch (error) {
      console.error('Notification scheduling error:', error);
      throw error;
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications() {
    try {
      const now = new Date();
      
      // In production, query scheduled notifications where sendAt <= now
      // For now, return mock processing results
      console.log('Processing scheduled notifications at:', now);
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        nextCheck: new Date(now.getTime() + 5 * 60 * 1000) // Check again in 5 minutes
      };
    } catch (error) {
      console.error('Scheduled notifications processing error:', error);
      return {
        processed: 0,
        sent: 0,
        failed: 1,
        error: error.message
      };
    }
  }
}

module.exports = new NotificationService();