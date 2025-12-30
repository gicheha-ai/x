// Payment helper utilities for the e-commerce platform

// Payment gateway configurations
export const PAYMENT_GATEWAYS = {
  STRIPE: {
    name: 'Stripe',
    publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY,
    endpoint: '/api/payments/stripe',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    minAmount: 0.50,
    maxAmount: 999999.99,
    processingFee: 2.9,
    fixedFee: 0.30
  },
  PAYPAL: {
    name: 'PayPal',
    clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID,
    endpoint: '/api/payments/paypal',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    minAmount: 1.00,
    maxAmount: 10000.00,
    processingFee: 3.49,
    fixedFee: 0
  },
  AIRTEL_MONEY: {
    name: 'Airtel Money',
    merchantId: process.env.REACT_APP_AIRTEL_MERCHANT_ID,
    endpoint: '/api/payments/airtel-money',
    currencies: ['KES', 'UGX', 'TZS', 'RWF'],
    minAmount: 10.00,
    maxAmount: 1000000.00,
    processingFee: 1.5,
    fixedFee: 0,
    superAdminMobile: '254105441783'
  },
  BANK_TRANSFER: {
    name: 'Bank Transfer',
    endpoint: '/api/payments/bank-transfer',
    currencies: ['USD', 'EUR', 'GBP', 'KES'],
    minAmount: 10.00,
    maxAmount: 100000.00,
    processingFee: 1.0,
    fixedFee: 0,
    processingTime: '1-3 business days'
  }
};

// Calculate payment processing fees
export const calculateProcessingFee = (amount, paymentMethod, currency = 'USD') => {
  const gateway = PAYMENT_GATEWAYS[paymentMethod.toUpperCase()];
  
  if (!gateway) {
    return {
      fee: 0,
      total: amount,
      feePercentage: 0,
      fixedFee: 0
    };
  }
  
  let fee = (amount * gateway.processingFee) / 100;
  
  // Add fixed fee if applicable
  if (gateway.fixedFee) {
    fee += gateway.fixedFee;
  }
  
  // Round to 2 decimal places
  fee = Math.round(fee * 100) / 100;
  
  const total = amount + fee;
  
  return {
    fee,
    total,
    feePercentage: gateway.processingFee,
    fixedFee: gateway.fixedFee || 0,
    gateway: gateway.name
  };
};

// Validate payment amount for gateway
export const validatePaymentAmount = (amount, paymentMethod, currency = 'USD') => {
  const gateway = PAYMENT_GATEWAYS[paymentMethod.toUpperCase()];
  
  if (!gateway) {
    return {
      isValid: false,
      error: 'Invalid payment method'
    };
  }
  
  // Check if currency is supported
  if (!gateway.currencies.includes(currency)) {
    return {
      isValid: false,
      error: `Currency ${currency} not supported for ${gateway.name}`
    };
  }
  
  // Check minimum amount
  if (amount < gateway.minAmount) {
    return {
      isValid: false,
      error: `Minimum amount is ${formatCurrency(gateway.minAmount, currency)}`
    };
  }
  
  // Check maximum amount
  if (amount > gateway.maxAmount) {
    return {
      isValid: false,
      error: `Maximum amount is ${formatCurrency(gateway.maxAmount, currency)}`
    };
  }
  
  return {
    isValid: true,
    gateway: gateway.name,
    processingFee: calculateProcessingFee(amount, paymentMethod, currency)
  };
};

// Format payment method for display
export const formatPaymentMethod = (method) => {
  const methods = {
    'stripe': 'Credit/Debit Card',
    'paypal': 'PayPal',
    'airtel_money': 'Airtel Money',
    'bank_transfer': 'Bank Transfer',
    'cash_on_delivery': 'Cash on Delivery',
    'wallet': 'Wallet Balance'
  };
  
  return methods[method] || method;
};

// Get payment method icon
export const getPaymentMethodIcon = (method) => {
  const icons = {
    'stripe': '💳',
    'paypal': '👛',
    'airtel_money': '📱',
    'bank_transfer': '🏦',
    'cash_on_delivery': '💰',
    'wallet': '👛'
  };
  
  return icons[method] || '💳';
};

// Get payment method details
export const getPaymentMethodDetails = (method) => {
  const details = {
    'stripe': {
      name: 'Credit/Debit Card',
      description: 'Pay securely with your credit or debit card',
      processingTime: 'Instant',
      supportedCards: ['Visa', 'Mastercard', 'American Express', 'Discover'],
      security: 'PCI-DSS compliant, encrypted transactions',
      icon: '💳'
    },
    'paypal': {
      name: 'PayPal',
      description: 'Pay with your PayPal account or credit card',
      processingTime: 'Instant',
      supportedCards: ['All major cards via PayPal'],
      security: 'PayPal secure payment system',
      icon: '👛'
    },
    'airtel_money': {
      name: 'Airtel Money',
      description: 'Mobile money payment via Airtel',
      processingTime: '2-5 minutes',
      supportedCards: [],
      security: 'Airtel Money secure PIN authentication',
      icon: '📱',
      superAdminMobile: '254105441783'
    },
    'bank_transfer': {
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      processingTime: '1-3 business days',
      supportedCards: [],
      security: 'Bank-level security',
      icon: '🏦'
    }
  };
  
  return details[method] || details['stripe'];
};

// Generate payment reference number
export const generatePaymentReference = (prefix = 'PAY') => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// Generate transaction ID
export const generateTransactionId = () => {
  return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Validate credit card number using Luhn algorithm
export const validateCardNumber = (cardNumber) => {
  // Remove all non-digit characters
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return {
      isValid: false,
      error: 'Invalid card number length'
    };
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  const isValid = sum % 10 === 0;
  
  // Detect card type
  const cardType = detectCardType(cleaned);
  
  return {
    isValid,
    cardType,
    masked: formatCardNumber(cleaned),
    error: isValid ? '' : 'Invalid card number'
  };
};

// Detect card type from number
export const detectCardType = (cardNumber) => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Visa
  if (/^4/.test(cleaned)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    return 'mastercard';
  }
  
  // American Express
  if (/^3[47]/.test(cleaned)) {
    return 'amex';
  }
  
  // Discover
  if (/^6(?:011|5)/.test(cleaned)) {
    return 'discover';
  }
  
  // Diners Club
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) {
    return 'diners';
  }
  
  // JCB
  if (/^35/.test(cleaned)) {
    return 'jcb';
  }
  
  return 'unknown';
};

// Format card number for display (masked)
export const formatCardNumber = (cardNumber, visibleDigits = 4) => {
  if (!cardNumber) return '';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length <= visibleDigits) {
    return cleaned;
  }
  
  const lastDigits = cleaned.slice(-visibleDigits);
  const masked = '•'.repeat(cleaned.length - visibleDigits);
  
  return masked + lastDigits;
};

// Validate card expiry date
export const validateCardExpiry = (month, year) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const expiryYear = parseInt('20' + year, 10);
  const expiryMonth = parseInt(month, 10);
  
  if (expiryMonth < 1 || expiryMonth > 12) {
    return {
      isValid: false,
      error: 'Invalid month'
    };
  }
  
  if (expiryYear < currentYear) {
    return {
      isValid: false,
      error: 'Card has expired'
    };
  }
  
  if (expiryYear === currentYear && expiryMonth < currentMonth) {
    return {
      isValid: false,
      error: 'Card has expired'
    };
  }
  
  return {
    isValid: true,
    formatted: `${month.padStart(2, '0')}/${year}`
  };
};

// Validate CVV
export const validateCVV = (cvv, cardType = 'unknown') => {
  const cleaned = cvv.replace(/\D/g, '');
  
  const lengthMap = {
    'visa': [3, 4],
    'mastercard': 3,
    'amex': 4,
    'discover': 3,
    'diners': 3,
    'jcb': 3,
    'unknown': [3, 4]
  };
  
  const expectedLength = lengthMap[cardType];
  const isValidLength = Array.isArray(expectedLength) 
    ? expectedLength.includes(cleaned.length)
    : cleaned.length === expectedLength;
  
  if (!isValidLength) {
    return {
      isValid: false,
      error: `Invalid CVV length for ${cardType}`
    };
  }
  
  return {
    isValid: true,
    masked: '•'.repeat(cleaned.length)
  };
};

// Format expiry date
export const formatExpiryDate = (expiry) => {
  if (!expiry) return '';
  
  // Remove non-digits
  const cleaned = expiry.replace(/\D/g, '');
  
  if (cleaned.length >= 2) {
    const month = cleaned.substring(0, 2);
    const year = cleaned.substring(2, 4);
    
    if (year) {
      return `${month}/${year}`;
    }
    return `${month}/`;
  }
  
  return cleaned;
};

// Get card icon based on type
export const getCardIcon = (cardType) => {
  const icons = {
    'visa': '💳',
    'mastercard': '💳',
    'amex': '💳',
    'discover': '💳',
    'diners': '💳',
    'jcb': '💳',
    'unknown': '💳'
  };
  
  return icons[cardType] || '💳';
};

// Parse payment response
export const parsePaymentResponse = (response) => {
  if (!response) {
    return {
      success: false,
      message: 'No response from payment gateway'
    };
  }
  
  const { success, data, message } = response;
  
  if (success) {
    return {
      success: true,
      transactionId: data.transactionId,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      timestamp: data.timestamp || new Date().toISOString(),
      receiptUrl: data.receiptUrl,
      nextAction: data.nextAction,
      message: message || 'Payment successful'
    };
  }
  
  return {
    success: false,
    errorCode: data?.errorCode,
    errorMessage: message || 'Payment failed',
    retryable: data?.retryable || false,
    suggestedAction: data?.suggestedAction
  };
};

// Create payment receipt
export const createPaymentReceipt = (paymentData) => {
  const {
    transactionId,
    reference,
    amount,
    currency,
    method,
    items = [],
    customer,
    timestamp = new Date().toISOString()
  } = paymentData;
  
  const receipt = {
    receiptNumber: reference || generatePaymentReference(),
    transactionId: transactionId || generateTransactionId(),
    date: new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    amount,
    currency,
    paymentMethod: formatPaymentMethod(method),
    items: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price
    })),
    subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    tax: paymentData.tax || 0,
    shipping: paymentData.shipping || 0,
    processingFee: paymentData.processingFee || 0,
    total: amount,
    customer: customer || {},
    paymentStatus: 'completed',
    platform: 'E-Commerce Pro Platform'
  };
  
  return receipt;
};

// Generate payment summary
export const generatePaymentSummary = (cartItems, shipping = 0, taxRate = 0.08) => {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;
  
  return {
    subtotal,
    shipping,
    tax,
    taxRate: taxRate * 100,
    total,
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    items: cartItems.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }))
  };
};

// Check if payment method requires additional verification
export const requiresVerification = (paymentMethod, amount) => {
  const verificationMethods = ['bank_transfer'];
  const verificationThreshold = 1000; // Amount requiring verification
  
  return verificationMethods.includes(paymentMethod) || amount >= verificationThreshold;
};

// Get available payment methods based on amount and currency
export const getAvailablePaymentMethods = (amount, currency = 'USD') => {
  const methods = [];
  
  Object.entries(PAYMENT_GATEWAYS).forEach(([key, gateway]) => {
    const methodKey = key.toLowerCase().replace('_', '');
    
    if (gateway.currencies.includes(currency)) {
      if (amount >= gateway.minAmount && amount <= gateway.maxAmount) {
        methods.push({
          id: methodKey,
          name: gateway.name,
          minAmount: gateway.minAmount,
          maxAmount: gateway.maxAmount,
          processingFee: gateway.processingFee,
          fixedFee: gateway.fixedFee,
          processingTime: gateway.processingTime || 'Instant'
        });
      }
    }
  });
  
  return methods;
};

// Helper function to format currency (imported from formatters)
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};
