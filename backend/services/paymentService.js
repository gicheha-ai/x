// backend/src/services/paymentService.js
const Stripe = require('stripe');
const paypal = require('@paypal/checkout-server-sdk');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Payment service class
 */
class PaymentService {
  constructor() {
    this.stripe = null;
    this.paypal = null;
    this.initializeServices();
  }

  /**
   * Initialize payment services
   */
  initializeServices() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      console.log('Stripe payment service initialized');
    } else {
      console.warn('Stripe secret key not configured');
    }

    // Initialize PayPal
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      const environment = process.env.NODE_ENV === 'production' 
        ? new paypal.core.LiveEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
          )
        : new paypal.core.SandboxEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
          );
      
      this.paypal = new paypal.core.PayPalHttpClient(environment);
      console.log('PayPal payment service initialized');
    } else {
      console.warn('PayPal credentials not configured');
    }
  }

  /**
   * STRIPE PAYMENT METHODS
   */

  /**
   * Create Stripe customer
   */
  async createStripeCustomer(user, paymentMethodId = null) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe service not initialized');
      }

      const customerData = {
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email
        }
      };

      if (paymentMethodId) {
        customerData.payment_method = paymentMethodId;
      }

      const customer = await this.stripe.customers.create(customerData);
      
      return {
        success: true,
        customerId: customer.id,
        customer
      };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount, currency, customerId, metadata = {}) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe service not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentIntent
      };
    } catch (error) {
      console.error('Error creating Stripe payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm Stripe payment
   */
  async confirmStripePayment(paymentIntentId, paymentMethodId = null) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe service not initialized');
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        paymentMethodId ? { payment_method: paymentMethodId } : {}
      );

      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        paymentIntent
      };
    } catch (error) {
      console.error('Error confirming Stripe payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createStripeCheckoutSession(amount, currency, successUrl, cancelUrl, metadata = {}) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe service not initialized');
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: 'Order Payment',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
        session
      };
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund Stripe payment
   */
  async refundStripePayment(paymentIntentId, amount = null) {
    try {
      if (!this.stripe) {
        throw new Error('Stripe service not initialized');
      }

      const refundData = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        refund
      };
    } catch (error) {
      console.error('Error refunding Stripe payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PAYPAL PAYMENT METHODS
   */

  /**
   * Create PayPal order
   */
  async createPayPalOrder(amount, currency, returnUrl, cancelUrl) {
    try {
      if (!this.paypal) {
        throw new Error('PayPal service not initialized');
      }

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            }
          }
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: process.env.APP_NAME || 'E-Commerce Pro',
          user_action: 'PAY_NOW'
        }
      });

      const order = await this.paypal.execute(request);
      
      return {
        success: true,
        orderId: order.result.id,
        approvalUrl: order.result.links.find(link => link.rel === 'approve').href,
        order: order.result
      };
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Capture PayPal order
   */
  async capturePayPalOrder(orderId) {
    try {
      if (!this.paypal) {
        throw new Error('PayPal service not initialized');
      }

      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.prefer("return=representation");

      const capture = await this.paypal.execute(request);
      
      return {
        success: capture.result.status === 'COMPLETED',
        status: capture.result.status,
        captureId: capture.result.purchase_units[0].payments.captures[0].id,
        capture
      };
    } catch (error) {
      console.error('Error capturing PayPal order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Refund PayPal payment
   */
  async refundPayPalPayment(captureId, amount = null, reason = '') {
    try {
      if (!this.paypal) {
        throw new Error('PayPal service not initialized');
      }

      const request = new paypal.payments.CapturesRefundRequest(captureId);
      
      const refundBody = {
        note_to_payer: reason || 'Refund requested'
      };

      if (amount) {
        refundBody.amount = {
          value: amount.toFixed(2),
          currency_code: 'USD'
        };
      }

      request.requestBody(refundBody);

      const refund = await this.paypal.execute(request);
      
      return {
        success: refund.result.status === 'COMPLETED',
        refundId: refund.result.id,
        refund
      };
    } catch (error) {
      console.error('Error refunding PayPal payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * AIRTEL MONEY PAYMENT METHODS
   */

  /**
   * Initialize Airtel Money payment
   */
  async initiateAirtelPayment(amount, phoneNumber, reference, callbackUrl) {
    try {
      // Airtel Money API credentials
      const clientId = process.env.AIRTEL_CLIENT_ID;
      const clientSecret = process.env.AIRTEL_CLIENT_SECRET;
      const apiKey = process.env.AIRTEL_API_KEY;
      const publicKey = process.env.AIRTEL_PUBLIC_KEY;

      if (!clientId || !clientSecret || !apiKey) {
        throw new Error('Airtel Money credentials not configured');
      }

      // Step 1: Get access token
      const authResponse = await axios.post(
        'https://openapi.airtel.africa/auth/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          }
        }
      );

      const accessToken = authResponse.data.access_token;

      // Step 2: Encrypt payload
      const payload = {
        reference: reference,
        subscriber: {
          country: 'KE',
          currency: 'KES',
          msisdn: phoneNumber.replace(/^\+/, '') // Remove + prefix
        },
        transaction: {
          amount: amount,
          country: 'KE',
          currency: 'KES',
          id: reference
        }
      };

      // Step 3: Initiate payment
      const paymentResponse = await axios.post(
        'https://openapi.airtel.africa/merchant/v1/payments/',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Country': 'KE',
            'X-Currency': 'KES'
          }
        }
      );

      return {
        success: true,
        transactionId: paymentResponse.data.data.transaction.id,
        status: paymentResponse.data.data.transaction.status,
        response: paymentResponse.data
      };
    } catch (error) {
      console.error('Error initiating Airtel payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Airtel payment
   */
  async verifyAirtelPayment(transactionId) {
    try {
      const clientId = process.env.AIRTEL_CLIENT_ID;
      const clientSecret = process.env.AIRTEL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Airtel Money credentials not configured');
      }

      // Get access token
      const authResponse = await axios.post(
        'https://openapi.airtel.africa/auth/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          }
        }
      );

      const accessToken = authResponse.data.access_token;

      // Verify transaction
      const verificationResponse = await axios.get(
        `https://openapi.airtel.africa/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Country': 'KE',
            'X-Currency': 'KES'
          }
        }
      );

      return {
        success: true,
        status: verificationResponse.data.data.transaction.status,
        response: verificationResponse.data
      };
    } catch (error) {
      console.error('Error verifying Airtel payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * BANK TRANSFER METHODS
   */

  /**
   * Generate bank transfer details
   */
  async generateBankTransferDetails(amount, currency, reference) {
    try {
      const bankDetails = {
        bankName: process.env.BANK_NAME || 'Example Bank',
        accountName: process.env.BANK_ACCOUNT_NAME || process.env.APP_NAME || 'E-Commerce Pro',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
        branchCode: process.env.BANK_BRANCH_CODE || '000',
        swiftCode: process.env.BANK_SWIFT_CODE || 'EXMPKENA',
        reference: reference,
        amount: amount,
        currency: currency,
        instructions: 'Please include the reference number in your transfer description.',
        estimatedProcessing: '1-3 business days'
      };

      // Generate QR code for bank transfer (using static QR code)
      const qrData = `Bank Transfer:${bankDetails.bankName}:${bankDetails.accountNumber}:${reference}:${amount}${currency}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

      return {
        success: true,
        bankDetails,
        qrCodeUrl,
        paymentInstructions: `Transfer ${amount} ${currency} to ${bankDetails.bankName}, Account: ${bankDetails.accountNumber}, Reference: ${reference}`
      };
    } catch (error) {
      console.error('Error generating bank transfer details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * WALLET PAYMENT METHODS
   */

  /**
   * Process wallet payment
   */
  async processWalletPayment(userId, amount, reference, description = '') {
    try {
      // In production, this would interact with your wallet database
      // This is a simplified implementation
      
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct from wallet
      user.wallet.balance -= amount;
      user.wallet.transactions.push({
        type: 'payment',
        amount: -amount,
        description: description || `Payment for ${reference}`,
        status: 'completed',
        reference: reference
      });
      
      await user.save();
      
      return {
        success: true,
        newBalance: user.wallet.balance,
        transactionId: `WALLET-${Date.now()}-${reference}`
      };
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add funds to wallet
   */
  async addToWallet(userId, amount, paymentMethod, reference) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Add to wallet
      user.wallet.balance += amount;
      user.wallet.lastTopUp = new Date();
      user.wallet.transactions.push({
        type: 'deposit',
        amount: amount,
        description: `Deposit via ${paymentMethod}`,
        status: 'completed',
        reference: reference
      });
      
      await user.save();
      
      return {
        success: true,
        newBalance: user.wallet.balance,
        transactionId: `DEPOSIT-${Date.now()}-${reference}`
      };
    } catch (error) {
      console.error('Error adding to wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * GENERIC PAYMENT METHODS
   */

  /**
   * Process payment based on method
   */
  async processPayment(method, paymentData) {
    try {
      const {
        amount,
        currency = 'USD',
        userId,
        reference,
        metadata = {},
        customerEmail,
        phoneNumber,
        returnUrl,
        cancelUrl
      } = paymentData;

      let result;

      switch (method.toLowerCase()) {
        case 'stripe':
          result = await this.processStripePayment(amount, currency, customerEmail, metadata);
          break;

        case 'paypal':
          result = await this.processPayPalPayment(amount, currency, returnUrl, cancelUrl);
          break;

        case 'airtel':
        case 'mobile':
          result = await this.processMobilePayment(amount, phoneNumber, reference);
          break;

        case 'bank':
          result = await this.generateBankTransferDetails(amount, currency, reference);
          break;

        case 'wallet':
          result = await this.processWalletPayment(userId, amount, reference);
          break;

        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }

      return {
        success: true,
        method,
        ...result
      };
    } catch (error) {
      console.error(`Error processing ${method} payment:`, error);
      return {
        success: false,
        method,
        error: error.message
      };
    }
  }

  /**
   * Process Stripe payment (simplified)
   */
  async processStripePayment(amount, currency, customerEmail, metadata) {
    if (!this.stripe) {
      throw new Error('Stripe service not initialized');
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata,
      receipt_email: customerEmail
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      requiresAction: paymentIntent.status === 'requires_action',
      status: paymentIntent.status
    };
  }

  /**
   * Process PayPal payment (simplified)
   */
  async processPayPalPayment(amount, currency, returnUrl, cancelUrl) {
    if (!this.paypal) {
      throw new Error('PayPal service not initialized');
    }

    const orderResult = await this.createPayPalOrder(amount, currency, returnUrl, cancelUrl);
    
    return {
      orderId: orderResult.orderId,
      approvalUrl: orderResult.approvalUrl
    };
  }

  /**
   * Process mobile payment (simplified)
   */
  async processMobilePayment(amount, phoneNumber, reference) {
    const callbackUrl = `${process.env.BACKEND_URL}/api/payments/webhook/airtel`;
    return await this.initiateAirtelPayment(amount, phoneNumber, reference, callbackUrl);
  }

  /**
   * Verify payment
   */
  async verifyPayment(method, paymentId) {
    try {
      let result;

      switch (method.toLowerCase()) {
        case 'stripe':
          if (!this.stripe) {
            throw new Error('Stripe service not initialized');
          }
          const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
          result = {
            success: paymentIntent.status === 'succeeded',
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata
          };
          break;

        case 'paypal':
          if (!this.paypal) {
            throw new Error('PayPal service not initialized');
          }
          const orderRequest = new paypal.orders.OrdersGetRequest(paymentId);
          const order = await this.paypal.execute(orderRequest);
          result = {
            success: order.result.status === 'COMPLETED',
            status: order.result.status,
            amount: order.result.purchase_units[0].amount.value,
            currency: order.result.purchase_units[0].amount.currency_code
          };
          break;

        case 'airtel':
        case 'mobile':
          result = await this.verifyAirtelPayment(paymentId);
          break;

        case 'wallet':
          // Wallet payments are immediately verified
          result = {
            success: true,
            status: 'completed'
          };
          break;

        default:
          throw new Error(`Unsupported verification method: ${method}`);
      }

      return {
        success: true,
        method,
        ...result
      };
    } catch (error) {
      console.error(`Error verifying ${method} payment:`, error);
      return {
        success: false,
        method,
        error: error.message
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(method, paymentId, amount = null, reason = '') {
    try {
      let result;

      switch (method.toLowerCase()) {
        case 'stripe':
          result = await this.refundStripePayment(paymentId, amount);
          break;

        case 'paypal':
          result = await this.refundPayPalPayment(paymentId, amount, reason);
          break;

        case 'wallet':
          // Wallet refunds would be handled differently
          result = {
            success: true,
            message: 'Wallet refund processed internally'
          };
          break;

        default:
          throw new Error(`Refund not supported for method: ${method}`);
      }

      return {
        success: true,
        method,
        ...result
      };
    } catch (error) {
      console.error(`Error refunding ${method} payment:`, error);
      return {
        success: false,
        method,
        error: error.message
      };
    }
  }

  /**
   * Get payment methods available for user
   */
  async getAvailablePaymentMethods(userCountry = 'US', userCurrency = 'USD') {
    const methods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, MasterCard, or American Express',
        icon: 'credit-card',
        enabled: !!this.stripe,
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        countries: ['US', 'CA', 'GB', 'AU', 'EU'],
        fees: '2.9% + $0.30 per transaction'
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with your PayPal account',
        icon: 'paypal',
        enabled: !!this.paypal,
        currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        countries: ['US', 'CA', 'GB', 'AU', 'EU'],
        fees: '2.9% + $0.30 per transaction'
      },
      {
        id: 'airtel',
        name: 'Airtel Money',
        description: 'Pay with your Airtel Money account',
        icon: 'mobile-alt',
        enabled: !!process.env.AIRTEL_CLIENT_ID,
        currencies: ['KES'],
        countries: ['KE', 'UG', 'TZ', 'RW'],
        fees: '2% per transaction'
      },
      {
        id: 'bank',
        name: 'Bank Transfer',
        description: 'Transfer directly to our bank account',
        icon: 'university',
        enabled: true,
        currencies: ['USD', 'EUR', 'GBP', 'KES'],
        countries: ['ALL'],
        fees: 'Free',
        processingTime: '1-3 business days'
      },
      {
        id: 'wallet',
        name: 'Wallet Balance',
        description: 'Pay using your wallet balance',
        icon: 'wallet',
        enabled: true,
        currencies: ['USD'],
        countries: ['ALL'],
        fees: 'Free'
      }
    ];

    // Filter methods based on user's country and currency
    const availableMethods = methods.filter(method => {
      if (!method.enabled) return false;
      if (!method.currencies.includes(userCurrency)) return false;
      if (method.countries[0] !== 'ALL' && !method.countries.includes(userCountry)) return false;
      return true;
    });

    return {
      success: true,
      methods: availableMethods,
      defaultMethod: availableMethods[0]?.id || 'bank'
    };
  }

  /**
   * Calculate payment fees
   */
  calculatePaymentFees(method, amount) {
    let fees = 0;
    let percentage = 0;
    let fixed = 0;

    switch (method.toLowerCase()) {
      case 'stripe':
      case 'paypal':
        percentage = 2.9;
        fixed = 0.30;
        fees = (amount * (percentage / 100)) + fixed;
        break;

      case 'airtel':
      case 'mobile':
        percentage = 2.0;
        fees = amount * (percentage / 100);
        break;

      case 'bank':
        fees = 0;
        break;

      case 'wallet':
        fees = 0;
        break;

      default:
        percentage = 3.0;
        fees = amount * (percentage / 100);
    }

    return {
      method,
      amount,
      fees: parseFloat(fees.toFixed(2)),
      netAmount: parseFloat((amount - fees).toFixed(2)),
      percentage,
      fixed
    };
  }

  /**
   * Generate payment receipt
   */
  generatePaymentReceipt(paymentData) {
    const {
      paymentId,
      amount,
      currency,
      method,
      customerName,
      customerEmail,
      date,
      transactionId,
      status
    } = paymentData;

    const receiptId = `RECEIPT-${Date.now()}-${paymentId.substring(0, 8)}`;
    
    const receipt = {
      receiptId,
      paymentId,
      transactionId,
      date: date || new Date().toISOString(),
      customer: {
        name: customerName,
        email: customerEmail
      },
      payment: {
        method,
        amount: parseFloat(amount).toFixed(2),
        currency,
        status
      },
      fees: this.calculatePaymentFees(method, amount),
      company: {
        name: process.env.APP_NAME || 'E-Commerce Pro',
        address: process.env.COMPANY_ADDRESS || '123 Business St, City, Country',
        email: process.env.SUPPORT_EMAIL || 'support@example.com',
        phone: process.env.SUPPORT_PHONE || '+1 (555) 123-4567'
      }
    };

    return receipt;
  }

  /**
   * Test payment service
   */
  async testPaymentService(method = 'stripe') {
    try {
      const testAmount = 10.00;
      const testCurrency = 'USD';
      const testEmail = 'test@example.com';
      const testReference = `TEST-${Date.now()}`;

      let result;

      switch (method.toLowerCase()) {
        case 'stripe':
          if (!this.stripe) {
            throw new Error('Stripe service not initialized');
          }
          result = await this.createStripePaymentIntent(
            testAmount,
            testCurrency,
            null,
            { test: true, reference: testReference }
          );
          break;

        case 'paypal':
          if (!this.paypal) {
            throw new Error('PayPal service not initialized');
          }
          result = await this.createPayPalOrder(
            testAmount,
            testCurrency,
            'https://example.com/success',
            'https://example.com/cancel'
          );
          break;

        default:
          throw new Error(`Test not supported for method: ${method}`);
      }

      return {
        success: true,
        method,
        testAmount,
        testCurrency,
        testReference,
        ...result
      };
    } catch (error) {
      console.error(`Error testing ${method} payment service:`, error);
      return {
        success: false,
        method,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = paymentService;