import { paymentApi } from './api';

export const paymentService = {
  createPayment: async (paymentData) => {
    try {
      const response = await paymentApi.createPayment(paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Payment creation failed' };
    }
  },

  processStripe: async (paymentData) => {
    try {
      const response = await paymentApi.processStripe(paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Stripe payment failed' };
    }
  },

  processPayPal: async (paymentData) => {
    try {
      const response = await paymentApi.processPayPal(paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'PayPal payment failed' };
    }
  },

  processAirtelMoney: async (paymentData) => {
    try {
      const response = await paymentApi.processAirtelMoney(paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Airtel Money payment failed' };
    }
  },

  processBankTransfer: async (paymentData) => {
    try {
      const response = await paymentApi.processBankTransfer(paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Bank transfer failed' };
    }
  },

  getPaymentMethods: async () => {
    try {
      const response = await paymentApi.getPaymentMethods();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch payment methods' };
    }
  },

  getPaymentHistory: async () => {
    try {
      const response = await paymentApi.getPaymentHistory();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch payment history' };
    }
  },

  // Helper methods
  formatPaymentData: (amount, currency = 'USD', description = '', metadata = {}) => {
    return {
      amount,
      currency: currency.toUpperCase(),
      description,
      metadata: {
        platform: 'E-Commerce Pro',
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
  },

  validatePaymentData: (paymentData) => {
    const errors = [];
    
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!paymentData.currency) {
      errors.push('Currency is required');
    }
    
    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }
    
    // Validate specific payment methods
    switch (paymentData.paymentMethod) {
      case 'stripe':
        if (!paymentData.cardToken) {
          errors.push('Card token is required for Stripe payments');
        }
        break;
      case 'paypal':
        if (!paymentData.paypalOrderId) {
          errors.push('PayPal order ID is required');
        }
        break;
      case 'airtel_money':
        if (!paymentData.phoneNumber) {
          errors.push('Phone number is required for Airtel Money');
        }
        if (!paymentData.airtelTransactionId) {
          errors.push('Transaction ID is required for Airtel Money');
        }
        break;
      case 'bank_transfer':
        if (!paymentData.referenceNumber) {
          errors.push('Reference number is required for bank transfer');
        }
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getPaymentMethodDetails: (method) => {
    const methods = {
      'stripe': {
        name: 'Credit/Debit Card (Stripe)',
        icon: '💳',
        description: 'Secure payment with Visa, Mastercard, etc.',
        processingTime: 'Instant'
      },
      'paypal': {
        name: 'PayPal',
        icon: '👛',
        description: 'Pay with your PayPal account',
        processingTime: 'Instant'
      },
      'airtel_money': {
        name: 'Airtel Money',
        icon: '📱',
        description: 'Mobile money payment via Airtel',
        processingTime: '2-5 minutes'
      },
      'bank_transfer': {
        name: 'Bank Transfer',
        icon: '🏦',
        description: 'Direct bank transfer',
        processingTime: '1-3 business days'
      }
    };
    
    return methods[method] || {
      name: 'Unknown Method',
      icon: '❓',
      description: 'Payment method not recognized',
      processingTime: 'Unknown'
    };
  },

  calculateTransactionFee: (amount, method) => {
    const fees = {
      'stripe': 0.029, // 2.9% + $0.30
      'paypal': 0.0349, // 3.49%
      'airtel_money': 0.015, // 1.5%
      'bank_transfer': 0.01 // 1%
    };
    
    const feeRate = fees[method] || 0.03; // Default 3%
    const fee = amount * feeRate;
    
    // Add fixed fee for Stripe
    if (method === 'stripe') {
      return fee + 0.30;
    }
    
    return fee;
  },

  // Super admin mobile money number
  getSuperAdminMobile: () => {
    return '254105441783';
  },

  generateReceipt: (payment) => {
    const receipt = {
      receiptNumber: `REC-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      paymentId: payment.id || `PAY-${Date.now().toString().slice(-6)}`,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.paymentMethod,
      status: payment.status || 'completed',
      items: payment.items || [],
      platformFee: payment.fee || 0,
      total: payment.total || payment.amount
    };
    
    return receipt;
  }
};