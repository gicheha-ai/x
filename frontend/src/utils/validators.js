// Form validation utilities for the e-commerce platform

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  // Check for super admin email (gichehalawrence@gmail.com)
  if (email === 'gichehalawrence@gmail.com') {
    return { 
      isValid: true, 
      message: 'Super admin email detected',
      isSuperAdmin: true 
    };
  }
  
  return { isValid: true, message: '' };
};

// Password validation
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    return { isValid: false, message: 'Password is required', errors: ['Password is required'] };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : '',
    errors
  };
};

// Username validation
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 20) {
    return { isValid: false, message: 'Username must be less than 20 characters' };
  }
  
  if (!usernameRegex.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  
  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'superadmin', 'administrator', 'support', 'help', 
    'contact', 'info', 'system', 'root', 'super', 'user', 'seller',
    'affiliate', 'buyer', 'customer', 'guest'
  ];
  
  if (reservedUsernames.includes(username.toLowerCase())) {
    return { isValid: false, message: 'This username is reserved' };
  }
  
  return { isValid: true, message: '' };
};

// Phone number validation
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }
  
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return { isValid: false, message: 'Phone number must be at least 10 digits' };
  }
  
  if (cleanPhone.length > 15) {
    return { isValid: false, message: 'Phone number is too long' };
  }
  
  // Validate Kenyan number format (254xxxxxxxxx)
  const kenyanRegex = /^254\d{9}$/;
  if (cleanPhone.startsWith('254')) {
    if (!kenyanRegex.test(cleanPhone)) {
      return { isValid: false, message: 'Invalid Kenyan phone number format' };
    }
  }
  
  // Validate international format
  const internationalRegex = /^\d{10,15}$/;
  if (!internationalRegex.test(cleanPhone)) {
    return { isValid: false, message: 'Invalid phone number format' };
  }
  
  return { 
    isValid: true, 
    message: '', 
    cleaned: cleanPhone,
    formatted: formatPhoneNumber(cleanPhone)
  };
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  if (!name) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (name.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters` };
  }
  
  if (name.length > 50) {
    return { isValid: false, message: `${fieldName} must be less than 50 characters` };
  }
  
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { isValid: true, message: '' };
};

// Address validation
export const validateAddress = (address) => {
  if (!address) {
    return { isValid: false, message: 'Address is required' };
  }
  
  if (address.length < 10) {
    return { isValid: false, message: 'Address is too short' };
  }
  
  if (address.length > 200) {
    return { isValid: false, message: 'Address is too long' };
  }
  
  return { isValid: true, message: '' };
};

// Product validation
export const validateProduct = (productData) => {
  const errors = {};
  
  // Name validation
  if (!productData.name || productData.name.trim().length < 3) {
    errors.name = 'Product name must be at least 3 characters';
  }
  
  if (productData.name && productData.name.length > 200) {
    errors.name = 'Product name must be less than 200 characters';
  }
  
  // Description validation
  if (!productData.description || productData.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  
  if (productData.description && productData.description.length > 5000) {
    errors.description = 'Description must be less than 5000 characters';
  }
  
  // Price validation
  if (!productData.price || productData.price <= 0) {
    errors.price = 'Price must be greater than 0';
  }
  
  if (productData.price && productData.price > 1000000) {
    errors.price = 'Price cannot exceed $1,000,000';
  }
  
  // Stock validation
  if (productData.stock === undefined || productData.stock === null) {
    errors.stock = 'Stock is required';
  }
  
  if (productData.stock < 0) {
    errors.stock = 'Stock cannot be negative';
  }
  
  if (productData.stock > 1000000) {
    errors.stock = 'Stock cannot exceed 1,000,000';
  }
  
  // Category validation
  if (!productData.category) {
    errors.category = 'Category is required';
  }
  
  // Images validation
  if (productData.images && productData.images.length > 10) {
    errors.images = 'Maximum 10 images allowed';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    message: isValid ? '' : 'Please fix the errors below'
  };
};

// Payment validation
export const validatePayment = (paymentData) => {
  const errors = {};
  
  // Amount validation
  if (!paymentData.amount || paymentData.amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }
  
  if (paymentData.amount && paymentData.amount > 100000) {
    errors.amount = 'Amount cannot exceed $100,000';
  }
  
  // Currency validation
  if (!paymentData.currency) {
    errors.currency = 'Currency is required';
  }
  
  // Payment method validation
  if (!paymentData.paymentMethod) {
    errors.paymentMethod = 'Payment method is required';
  }
  
  // Validate specific payment methods
  switch (paymentData.paymentMethod) {
    case 'stripe':
      if (!paymentData.cardToken && !paymentData.paymentMethodId) {
        errors.card = 'Card information is required';
      }
      break;
      
    case 'paypal':
      if (!paymentData.paypalOrderId) {
        errors.paypal = 'PayPal order ID is required';
      }
      break;
      
    case 'airtel_money':
      if (!paymentData.phoneNumber) {
        errors.phoneNumber = 'Phone number is required';
      }
      
      if (paymentData.phoneNumber) {
        const phoneValidation = validatePhoneNumber(paymentData.phoneNumber);
        if (!phoneValidation.isValid) {
          errors.phoneNumber = phoneValidation.message;
        }
      }
      
      if (!paymentData.transactionId) {
        errors.transactionId = 'Transaction ID is required';
      }
      break;
      
    case 'bank_transfer':
      if (!paymentData.referenceNumber) {
        errors.referenceNumber = 'Reference number is required';
      }
      break;
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    message: isValid ? '' : 'Please fix the payment errors'
  };
};

// Credit card validation
export const validateCreditCard = (cardData) => {
  const errors = {};
  
  // Card number validation (basic Luhn algorithm)
  if (!cardData.number) {
    errors.number = 'Card number is required';
  } else {
    const cleanNumber = cardData.number.replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.number = 'Invalid card number length';
    } else if (!luhnCheck(cleanNumber)) {
      errors.number = 'Invalid card number';
    }
  }
  
  // Expiry date validation
  if (!cardData.expiry) {
    errors.expiry = 'Expiry date is required';
  } else {
    const [month, year] = cardData.expiry.split('/').map(part => part.trim());
    if (!month || !year) {
      errors.expiry = 'Invalid expiry date format (MM/YY)';
    } else {
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      const expiryMonth = parseInt(month, 10);
      const expiryYear = parseInt(year, 10);
      
      if (expiryMonth < 1 || expiryMonth > 12) {
        errors.expiry = 'Invalid month';
      }
      
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        errors.expiry = 'Card has expired';
      }
    }
  }
  
  // CVV validation
  if (!cardData.cvv) {
    errors.cvv = 'CVV is required';
  } else {
    const cvv = cardData.cvv.toString();
    if (cvv.length < 3 || cvv.length > 4) {
      errors.cvv = 'Invalid CVV';
    }
  }
  
  // Name validation
  if (!cardData.name) {
    errors.name = 'Name on card is required';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    message: isValid ? '' : 'Please fix the card errors'
  };
};

// Luhn algorithm for credit card validation
const luhnCheck = (cardNumber) => {
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// URL validation
export const validateUrl = (url, fieldName = 'URL') => {
  if (!url) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  try {
    new URL(url);
    return { isValid: true, message: '' };
  } catch {
    return { isValid: false, message: 'Invalid URL format' };
  }
};

// File validation
export const validateFile = (file, options = {}) => {
  const { 
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;
  
  const errors = [];
  
  if (!file) {
    return { isValid: false, errors: ['File is required'], message: 'File is required' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    errors.push(`File size must be less than ${maxSizeMB}MB`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension not supported. Allowed extensions: ${allowedExtensions.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    message: errors.length > 0 ? errors[0] : ''
  };
};

// Number validation
export const validateNumber = (value, options = {}) => {
  const { 
    min, 
    max, 
    required = true, 
    fieldName = 'Number',
    integer = false
  } = options;
  
  if (required && (value === undefined || value === null || value === '')) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }
  
  if (integer && !Number.isInteger(num)) {
    return { isValid: false, message: `${fieldName} must be an integer` };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, message: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, message: `${fieldName} must be at most ${max}` };
  }
  
  return { isValid: true, message: '' };
};

// Date validation
export const validateDate = (date, options = {}) => {
  const { 
    minDate, 
    maxDate, 
    required = true, 
    fieldName = 'Date',
    futureOnly = false,
    pastOnly = false
  } = options;
  
  if (required && !date) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message: 'Invalid date format' };
  }
  
  const now = new Date();
  
  if (futureOnly && dateObj <= now) {
    return { isValid: false, message: `${fieldName} must be in the future` };
  }
  
  if (pastOnly && dateObj >= now) {
    return { isValid: false, message: `${fieldName} must be in the past` };
  }
  
  if (minDate && dateObj < new Date(minDate)) {
    return { isValid: false, message: `${fieldName} must be after ${new Date(minDate).toLocaleDateString()}` };
  }
  
  if (maxDate && dateObj > new Date(maxDate)) {
    return { isValid: false, message: `${fieldName} must be before ${new Date(maxDate).toLocaleDateString()}` };
  }
  
  return { isValid: true, message: '' };
};

// Helper function to format phone number
const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return cleaned;
};

// Validate all form fields
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const rule = validationRules[field];
    const value = formData[field];
    
    let validationResult;
    
    switch (rule.type) {
      case 'email':
        validationResult = validateEmail(value);
        break;
      case 'password':
        validationResult = validatePassword(value);
        break;
      case 'username':
        validationResult = validateUsername(value);
        break;
      case 'phone':
        validationResult = validatePhoneNumber(value);
        break;
      case 'name':
        validationResult = validateName(value, rule.fieldName);
        break;
      case 'required':
        validationResult = { 
          isValid: value !== undefined && value !== null && value !== '', 
          message: `${rule.fieldName || field} is required` 
        };
        break;
      case 'number':
        validationResult = validateNumber(value, rule);
        break;
      case 'date':
        validationResult = validateDate(value, rule);
        break;
      case 'url':
        validationResult = validateUrl(value, rule.fieldName);
        break;
      case 'custom':
        validationResult = rule.validator(value, formData);
        break;
      default:
        validationResult = { isValid: true, message: '' };
    }
    
    if (!validationResult.isValid) {
      errors[field] = validationResult.message;
      isValid = false;
    }
  });
  
  return {
    isValid,
    errors,
    message: isValid ? '' : 'Please fix the form errors'
  };
};
