// Data formatting utilities for the e-commerce platform

// Format currency with proper symbols and localization
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined) {
    return formatCurrency(0, currency, locale);
  }
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return formatCurrency(0, currency, locale);
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } catch (error) {
    // Fallback formatting
    return `${currency === 'USD' ? '$' : currency} ${numAmount.toFixed(2)}`;
  }
};

// Format percentage
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) {
    return '0%';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0%';
  }
  
  return `${numValue.toFixed(decimals)}%`;
};

// Format number with commas
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) {
    return '0';
  }
  
  const num = typeof number === 'string' ? parseFloat(number) : number;
  
  if (isNaN(num)) {
    return '0';
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Format date for display
export const formatDate = (date, format = 'medium') => {
  if (!date) {
    return '';
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const options = {
    short: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    },
    medium: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    },
    long: { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    },
    withTime: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    fullWithTime: {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    },
    timeOnly: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    iso: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  };
  
  const selectedOptions = options[format] || options.medium;
  
  return dateObj.toLocaleDateString('en-US', selectedOptions);
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) {
    return '';
  }
  
  const now = new Date();
  const past = new Date(date);
  
  if (isNaN(past.getTime())) {
    return '';
  }
  
  const diffMs = now - past;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
};

// Format file size
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format phone number
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length and country code
  if (cleaned.startsWith('254')) {
    // Kenyan format: +254 XXX XXX XXX
    return `+${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    // US format: (XXX) XXX-XXXX
    return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    // Generic 10-digit format: (XXX) XXX-XXXX
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  } else if (cleaned.length > 10) {
    // International format with +
    return `+${cleaned}`;
  }
  
  return cleaned;
};

// Format credit card number (masked)
export const formatCreditCard = (cardNumber, visibleDigits = 4) => {
  if (!cardNumber) return '';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < visibleDigits) {
    return cleaned;
  }
  
  const lastDigits = cleaned.slice(-visibleDigits);
  const masked = '•'.repeat(cleaned.length - visibleDigits);
  
  return `${masked}${lastDigits}`;
};

// Format product rating
export const formatRating = (rating, maxRating = 5) => {
  if (rating === null || rating === undefined) {
    return 'No ratings';
  }
  
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  
  if (isNaN(numRating)) {
    return 'No ratings';
  }
  
  // Round to nearest 0.5
  const rounded = Math.round(numRating * 2) / 2;
  
  // Create star representation
  const fullStars = Math.floor(rounded);
  const halfStar = rounded % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (halfStar ? 1 : 0);
  
  let stars = '★'.repeat(fullStars);
  if (halfStar) stars += '½';
  stars += '☆'.repeat(emptyStars);
  
  return `${stars} (${numRating.toFixed(1)})`;
};

// Format order status
export const formatOrderStatus = (status) => {
  const statusMap = {
    'pending': 'Pending',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded',
    'failed': 'Failed'
  };
  
  return statusMap[status] || status;
};

// Format user role
export const formatUserRole = (role) => {
  const roleMap = {
    'buyer': 'Buyer',
    'seller': 'Seller',
    'affiliate': 'Affiliate',
    'admin': 'Administrator',
    'super_admin': 'Super Admin'
  };
  
  return roleMap[role] || role;
};

// Format boost plan
export const formatBoostPlan = (plan) => {
  const planMap = {
    'daily': 'Daily Boost',
    'weekly': 'Weekly Boost',
    'monthly': 'Monthly Boost',
    'featured': 'Featured Spot'
  };
  
  return planMap[plan] || plan;
};

// Format social media handle
export const formatSocialHandle = (platform, handle) => {
  if (!handle) return '';
  
  const platforms = {
    'twitter': '@',
    'instagram': '@',
    'facebook': '',
    'linkedin': '',
    'youtube': '@'
  };
  
  const prefix = platforms[platform] || '';
  return `${prefix}${handle}`;
};

// Format address
export const formatAddress = (address) => {
  if (!address) return '';
  
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100, ellipsis = '...') => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to break at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace).trim() + ellipsis;
  }
  
  return truncated.trim() + ellipsis;
};

// Format duration (e.g., "2 days 3 hours")
export const formatDuration = (seconds) => {
  if (!seconds) return '0 seconds';
  
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 && days === 0 && hours === 0) {
    parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  }
  
  return parts.join(' ') || '0 seconds';
};

// Format distance
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) {
    return '';
  }
  
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  }
  
  const kilometers = meters / 1000;
  return `${kilometers.toFixed(1)} km`;
};

// Format weight
export const formatWeight = (grams, unit = 'kg') => {
  if (grams === null || grams === undefined) {
    return '';
  }
  
  if (unit === 'kg') {
    const kilograms = grams / 1000;
    return `${kilograms.toFixed(2)} kg`;
  } else if (unit === 'lb') {
    const pounds = grams * 0.00220462;
    return `${pounds.toFixed(2)} lb`;
  }
  
  return `${grams} g`;
};

// Format dimensions
export const formatDimensions = (length, width, height, unit = 'cm') => {
  if (!length || !width || !height) {
    return '';
  }
  
  return `${length} × ${width} × ${height} ${unit}`;
};

// Create URL slug
export const createSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();
};

// Format boolean for display
export const formatBoolean = (value, trueText = 'Yes', falseText = 'No') => {
  return value ? trueText : falseText;
};

// Format array to comma-separated string
export const formatArray = (array, separator = ', ') => {
  if (!array || !Array.isArray(array)) {
    return '';
  }
  
  return array.filter(item => item).join(separator);
};

// Format object to readable string
export const formatObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return '';
  }
  
  return Object.entries(obj)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

// Format price range
export const formatPriceRange = (min, max, currency = 'USD') => {
  if (min === null || max === null) {
    return '';
  }
  
  if (min === max) {
    return formatCurrency(min, currency);
  }
  
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

// Format discount percentage
export const formatDiscount = (originalPrice, salePrice) => {
  if (!originalPrice || !salePrice || originalPrice <= salePrice) {
    return '';
  }
  
  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return `Save ${Math.round(discount)}%`;
};

// Format count with label (plural/singular)
export const formatCount = (count, singular, plural = null) => {
  if (count === 0) {
    return `No ${plural || singular + 's'}`;
  }
  
  if (count === 1) {
    return `1 ${singular}`;
  }
  
  return `${formatNumber(count)} ${plural || singular + 's'}`;
};