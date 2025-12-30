// Export all utility functions
export * from './constants';
export * from './helpers';
export * from './validators';
export * from './formatters';
export * from './paymentHelpers';
export * from './rankingAlgorithm';

// Additional utility functions that combine multiple utilities

// Comprehensive data validation
export const validateData = (data, schema) => {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach(field => {
    const fieldSchema = schema[field];
    const value = data[field];

    // Check required fields
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${fieldSchema.label || field} is required`;
      isValid = false;
      return;
    }

    // Skip validation if field is not required and empty
    if (!fieldSchema.required && (value === undefined || value === null || value === '')) {
      return;
    }

    // Type-specific validation
    switch (fieldSchema.type) {
      case 'email':
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) {
          errors[field] = emailValidation.message;
          isValid = false;
        }
        break;

      case 'password':
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) {
          errors[field] = passwordValidation.message;
          isValid = false;
        }
        break;

      case 'phone':
        const phoneValidation = validatePhoneNumber(value);
        if (!phoneValidation.isValid) {
          errors[field] = phoneValidation.message;
          isValid = false;
        }
        break;

      case 'number':
        const numberValidation = validateNumber(value, fieldSchema);
        if (!numberValidation.isValid) {
          errors[field] = numberValidation.message;
          isValid = false;
        }
        break;

      case 'date':
        const dateValidation = validateDate(value, fieldSchema);
        if (!dateValidation.isValid) {
          errors[field] = dateValidation.message;
          isValid = false;
        }
        break;

      case 'url':
        const urlValidation = validateUrl(value, fieldSchema.label);
        if (!urlValidation.isValid) {
          errors[field] = urlValidation.message;
          isValid = false;
        }
        break;

      case 'custom':
        if (fieldSchema.validator) {
          const customValidation = fieldSchema.validator(value, data);
          if (!customValidation.isValid) {
            errors[field] = customValidation.message;
            isValid = false;
          }
        }
        break;
    }

    // Length validation
    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      errors[field] = `${fieldSchema.label || field} must be at least ${fieldSchema.minLength} characters`;
      isValid = false;
    }

    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      errors[field] = `${fieldSchema.label || field} must be less than ${fieldSchema.maxLength} characters`;
      isValid = false;
    }

    // Pattern validation
    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      errors[field] = fieldSchema.patternMessage || `Invalid ${fieldSchema.label || field} format`;
      isValid = false;
    }
  });

  return { isValid, errors };
};

// Format data for API submission
export const formatForApi = (data, mappings = {}) => {
  const formatted = {};

  Object.keys(data).forEach(key => {
    const mapping = mappings[key] || {};
    let value = data[key];

    // Apply transformations
    if (mapping.transform) {
      value = mapping.transform(value, data);
    }

    // Format dates to ISO string
    if (value instanceof Date) {
      value = value.toISOString();
    }

    // Format numbers
    if (typeof value === 'number') {
      if (mapping.decimals !== undefined) {
        value = parseFloat(value.toFixed(mapping.decimals));
      }
    }

    // Use mapped key or original key
    const apiKey = mapping.key || key;
    formatted[apiKey] = value;
  });

  return formatted;
};

// Parse data from API response
export const parseFromApi = (data, mappings = {}) => {
  const parsed = {};

  Object.keys(mappings).forEach(apiKey => {
    const mapping = mappings[apiKey];
    const localKey = mapping.key || apiKey;
    let value = data[apiKey];

    // Handle missing values
    if (value === undefined || value === null) {
      if (mapping.default !== undefined) {
        value = mapping.default;
      } else {
        return;
      }
    }

    // Apply transformations
    if (mapping.parse) {
      value = mapping.parse(value, data);
    }

    // Parse dates
    if (mapping.type === 'date' && value) {
      value = new Date(value);
    }

    // Parse numbers
    if (mapping.type === 'number' && value !== undefined && value !== null) {
      value = parseFloat(value);
    }

    // Parse booleans
    if (mapping.type === 'boolean' && value !== undefined && value !== null) {
      value = Boolean(value);
    }

    parsed[localKey] = value;
  });

  // Include any unmapped fields
  Object.keys(data).forEach(apiKey => {
    if (!mappings[apiKey] && !parsed[apiKey]) {
      parsed[apiKey] = data[apiKey];
    }
  });

  return parsed;
};

// Generate SEO metadata
export const generateSeoMetadata = (pageData = {}) => {
  const defaults = {
    title: 'E-Commerce Pro Platform - Global Online Marketplace',
    description: 'Connect with buyers, sellers, and affiliates worldwide. Built-in monetization from day one with special administrative features.',
    keywords: 'ecommerce, marketplace, online shopping, sellers, buyers, affiliates, monetization',
    image: '/og-image.jpg',
    url: typeof window !== 'undefined' ? window.location.href : '',
    type: 'website'
  };

  const metadata = {
    ...defaults,
    ...pageData
  };

  // Format title with site name
  if (!metadata.title.includes('E-Commerce Pro')) {
    metadata.title = `${metadata.title} | E-Commerce Pro Platform`;
  }

  return metadata;
};

// Handle API errors consistently
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          success: false,
          message: data.message || 'Bad request',
          errors: data.errors || {},
          status
        };
      
      case 401:
        return {
          success: false,
          message: 'Please login to continue',
          status,
          redirect: '/login'
        };
      
      case 403:
        return {
          success: false,
          message: 'You do not have permission to perform this action',
          status
        };
      
      case 404:
        return {
          success: false,
          message: 'Resource not found',
          status
        };
      
      case 422:
        return {
          success: false,
          message: 'Validation failed',
          errors: data.errors || {},
          status
        };
      
      case 429:
        return {
          success: false,
          message: 'Too many requests. Please try again later.',
          status,
          retryAfter: error.response.headers['retry-after']
        };
      
      case 500:
        return {
          success: false,
          message: 'Server error. Please try again later.',
          status
        };
      
      default:
        return {
          success: false,
          message: data.message || `Error ${status}`,
          status
        };
    }
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      status: 0
    };
  } else {
    // Error in request setup
    return {
      success: false,
      message: error.message || defaultMessage,
      status: 0
    };
  }
};

// Debounce with immediate option
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Deep merge objects
export const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

// Generate unique ID
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Create query string from object
export const createQueryString = (params) => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  
  return searchParams.toString();
};

// Parse query string to object
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
};

// Format bytes to human readable
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Generate random color
export const generateRandomColor = () => {
  const colors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#a855f7'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};

// Get initials from name
export const getInitials = (name, maxLength = 2) => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, maxLength);
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, message: 'Copied to clipboard' };
  } catch (error) {
    console.error('Failed to copy:', error);
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { success: true, message: 'Copied to clipboard' };
    } catch (err) {
      document.body.removeChild(textArea);
      return { success: false, message: 'Failed to copy' };
    }
  }
};

// Check if value is empty
export const isEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

// Safe JSON parse
export const safeJsonParse = (str, defaultValue = {}) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// Safe JSON stringify
export const safeJsonStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
};

// Delay function
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
export const retry = async (fn, retries = 3, delayMs = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    await delay(delayMs);
    return retry(fn, retries - 1, delayMs * 2);
  }
};

// Group array by key
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// Sort array by key
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    let aValue = a[key];
    let bValue = b[key];
    
    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      aValue = aValue.getTime();
      bValue = bValue.getTime();
    }
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Filter array by multiple criteria
export const filterBy = (array, filters) => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      
      const itemValue = item[key];
      
      if (Array.isArray(value)) {
        return value.includes(itemValue);
      }
      
      if (typeof value === 'function') {
        return value(itemValue, item);
      }
      
      return itemValue === value;
    });
  });
};

// Paginate array
export const paginate = (array, page = 1, pageSize = 10) => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    data: array.slice(start, end),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// Generate pagination range
export const generatePaginationRange = (currentPage, totalPages, delta = 2) => {
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i);
    }
  }

  range.forEach(i => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  });

  return rangeWithDots;
};
