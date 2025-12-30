// Export all hooks
export * from './useAuth';
export * from './useCart';
export * from './useProducts';
export * from './useRevenue';
export * from './useLinkGenerator';

// Additional combined hooks

/**
 * Hook for product listing with filters and pagination
 */
export const useProductListing = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('boost');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const { products, loading, error, searchProducts } = useProducts();
  
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice);
    }
    
    if (filters.rating !== undefined) {
      filtered = filtered.filter(p => (p.averageRating || 0) >= filters.rating);
    }
    
    if (filters.inStock) {
      filtered = filtered.filter(p => (p.stock || 0) > 0);
    }
    
    if (filters.boostedOnly) {
      const now = new Date();
      filtered = filtered.filter(p => 
        p.boostData && 
        p.boostData.isActive && 
        new Date(p.boostData.expiresAt) > now
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'boost':
          // Super admin products first, then boosted, then by score
          const aIsSuperAdmin = a.seller?.email === 'gichehalawrence@gmail.com';
          const bIsSuperAdmin = b.seller?.email === 'gichehalawrence@gmail.com';
          
          if (aIsSuperAdmin && !bIsSuperAdmin) return -1;
          if (!aIsSuperAdmin && bIsSuperAdmin) return 1;
          
          const aIsBoosted = a.boostData?.isActive && new Date(a.boostData.expiresAt) > new Date();
          const bIsBoosted = b.boostData?.isActive && new Date(b.boostData.expiresAt) > new Date();
          
          if (aIsBoosted && !bIsBoosted) return -1;
          if (!aIsBoosted && bIsBoosted) return 1;
          
          // Calculate scores for ranking
          const { calculateProductScore } = require('../utils/rankingAlgorithm');
          const scoreA = calculateProductScore(a, a.boostData);
          const scoreB = calculateProductScore(b, b.boostData);
          return scoreB - scoreA;
          
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
          
        case 'price_low':
          return a.price - b.price;
          
        case 'price_high':
          return b.price - a.price;
          
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
          
        case 'sales':
          return (b.salesCount || 0) - (a.salesCount || 0);
          
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [products, filters, sortBy]);
  
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, page, pageSize]);
  
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1); // Reset to first page when filters change
  };
  
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  
  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };
  
  const prevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  };
  
  return {
    products: paginatedProducts,
    filteredProducts,
    loading,
    error,
    filters,
    sortBy,
    page,
    pageSize,
    totalPages,
    totalProducts: filteredProducts.length,
    updateFilter,
    setSortBy,
    setPageSize,
    clearFilters,
    nextPage,
    prevPage,
    goToPage,
    refresh: () => searchProducts('', filters)
  };
};

/**
 * Hook for shopping cart with product details
 */
export const useEnhancedCart = () => {
  const { cartItems, cartTotal, cartCount, ...cartActions } = useCart();
  const { products } = useProducts();
  
  const enhancedCartItems = useMemo(() => {
    return cartItems.map(cartItem => {
      const product = products.find(p => p._id === cartItem.productId || p.id === cartItem.id);
      
      if (product) {
        return {
          ...cartItem,
          productDetails: product,
          inStock: (product.stock || 0) >= cartItem.quantity,
          priceValid: product.price === cartItem.price,
          isSuperAdminProduct: product.seller?.email === 'gichehalawrence@gmail.com'
        };
      }
      
      return {
        ...cartItem,
        productDetails: null,
        inStock: true,
        priceValid: true,
        isSuperAdminProduct: false
      };
    });
  }, [cartItems, products]);
  
  const cartSummary = useMemo(() => {
    const subtotal = enhancedCartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    const sellerCount = new Set(
      enhancedCartItems
        .map(item => item.sellerId)
        .filter(Boolean)
    ).size;
    
    const superAdminItems = enhancedCartItems.filter(item => item.isSuperAdminProduct);
    const regularItems = enhancedCartItems.filter(item => !item.isSuperAdminProduct);
    
    return {
      subtotal,
      shipping,
      tax,
      total,
      itemCount: cartCount,
      sellerCount,
      superAdminItems: superAdminItems.length,
      regularItems: regularItems.length,
      hasOutOfStock: enhancedCartItems.some(item => !item.inStock),
      hasPriceChanges: enhancedCartItems.some(item => !item.priceValid)
    };
  }, [enhancedCartItems, cartCount]);
  
  const getSellerGroups = () => {
    const groups = {};
    
    enhancedCartItems.forEach(item => {
      const sellerId = item.sellerId || 'unknown';
      
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerId,
          sellerName: item.sellerName || 'Unknown Seller',
          items: [],
          subtotal: 0,
          isSuperAdmin: item.isSuperAdminProduct
        };
      }
      
      groups[sellerId].items.push(item);
      groups[sellerId].subtotal += item.price * item.quantity;
    });
    
    return Object.values(groups);
  };
  
  const validateCartForCheckout = () => {
    const errors = [];
    const warnings = [];
    
    if (enhancedCartItems.length === 0) {
      errors.push('Your cart is empty');
    }
    
    enhancedCartItems.forEach(item => {
      if (!item.inStock) {
        errors.push(`${item.name} is out of stock`);
      }
      
      if (!item.priceValid) {
        warnings.push(`Price has changed for ${item.name}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canCheckout: errors.length === 0 && enhancedCartItems.length > 0
    };
  };
  
  const calculateSavings = () => {
    let totalSavings = 0;
    
    enhancedCartItems.forEach(item => {
      if (item.productDetails?.originalPrice) {
        const savings = (item.productDetails.originalPrice - item.price) * item.quantity;
        totalSavings += savings;
      }
    });
    
    return totalSavings;
  };
  
  return {
    cartItems: enhancedCartItems,
    cartSummary,
    cartTotal,
    cartCount,
    getSellerGroups,
    validateCartForCheckout,
    calculateSavings,
    ...cartActions
  };
};

/**
 * Hook for user dashboard data
 */
export const useUserDashboard = () => {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const { products } = useProducts();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // This would call dashboard API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = {
        recentOrders: [
          { id: 'ORD-12345', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), total: 89.99, status: 'delivered' },
          { id: 'ORD-12346', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), total: 149.99, status: 'shipped' },
          { id: 'ORD-12347', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), total: 59.99, status: 'processing' }
        ],
        wishlistItems: products.slice(0, 3),
        recommendedProducts: products.slice(3, 6),
        notifications: [
          { id: 1, type: 'order', message: 'Your order has been shipped', read: false },
          { id: 2, type: 'product', message: 'A product on your wishlist is on sale', read: true },
          { id: 3, type: 'system', message: 'Welcome to E-Commerce Pro!', read: true }
        ],
        stats: {
          totalOrders: 12,
          totalSpent: 1250.99,
          favoriteCategory: 'Electronics',
          memberSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      };
      
      setDashboardData(mockData);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const getDashboardStats = () => {
    if (!dashboardData) return null;
    
    const stats = dashboardData.stats;
    
    if (user?.accountType === 'seller') {
      return {
        ...stats,
        totalProducts: products.filter(p => p.sellerId === user.id).length,
        totalSales: 45,
        totalRevenue: 4500,
        averageRating: 4.5
      };
    }
    
    if (user?.accountType === 'affiliate') {
      return {
        ...stats,
        totalReferrals: 25,
        totalCommissions: 1250,
        conversionRate: 20.5,
        affiliateLevel: 'Pro'
      };
    }
    
    return stats;
  };
  
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);
  
  return {
    dashboardData,
    loading,
    error,
    cartCount,
    getDashboardStats,
    refresh: loadDashboardData
  };
};

/**
 * Hook for responsive design
 */
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    // Set initial values
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1280
    }
  };
};

/**
 * Hook for form handling with validation
 */
export const useForm = (initialValues, validationSchema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleBlur = (name) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate on blur
    if (validationSchema && validationSchema[name]) {
      const fieldSchema = validationSchema[name];
      const value = values[name];
      
      let error = '';
      
      // Check required
      if (fieldSchema.required && !value) {
        error = `${fieldSchema.label || name} is required`;
      }
      
      // Check min length
      if (fieldSchema.minLength && value && value.length < fieldSchema.minLength) {
        error = `${fieldSchema.label || name} must be at least ${fieldSchema.minLength} characters`;
      }
      
      // Check max length
      if (fieldSchema.maxLength && value && value.length > fieldSchema.maxLength) {
        error = `${fieldSchema.label || name} must be less than ${fieldSchema.maxLength} characters`;
      }
      
      // Check pattern
      if (fieldSchema.pattern && value && !fieldSchema.pattern.test(value)) {
        error = fieldSchema.patternMessage || `Invalid ${fieldSchema.label || name} format`;
      }
      
      // Custom validation
      if (fieldSchema.validate && value) {
        const customError = fieldSchema.validate(value, values);
        if (customError) {
          error = customError;
        }
      }
      
      if (error) {
        setErrors(prev => ({
          ...prev,
          [name]: error
        }));
      }
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (validationSchema) {
      Object.keys(validationSchema).forEach(name => {
        const fieldSchema = validationSchema[name];
        const value = values[name];
        
        let error = '';
        
        // Check required
        if (fieldSchema.required && !value) {
          error = `${fieldSchema.label || name} is required`;
        }
        
        // Check min length
        if (fieldSchema.minLength && value && value.length < fieldSchema.minLength) {
          error = `${fieldSchema.label || name} must be at least ${fieldSchema.minLength} characters`;
        }
        
        // Check max length
        if (fieldSchema.maxLength && value && value.length > fieldSchema.maxLength) {
          error = `${fieldSchema.label || name} must be less than ${fieldSchema.maxLength} characters`;
        }
        
        // Check pattern
        if (fieldSchema.pattern && value && !fieldSchema.pattern.test(value)) {
          error = fieldSchema.patternMessage || `Invalid ${fieldSchema.label || name} format`;
        }
        
        // Custom validation
        if (fieldSchema.validate && value) {
          const customError = fieldSchema.validate(value, values);
          if (customError) {
            error = customError;
          }
        }
        
        if (error) {
          newErrors[name] = error;
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (onSubmit) => {
    setIsSubmitting(true);
    
    // Validate form
    const isValid = validateForm();
    
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          submit: error.message || 'Submission failed'
        }));
      }
    }
    
    setIsSubmitting(false);
  };
  
  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };
  
  const setFieldValue = (name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const setFieldError = (name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    resetForm,
    setFieldValue,
    setFieldError,
    setValues,
    isValid: Object.keys(errors).length === 0
  };
};

// Import necessary dependencies
import { useState, useEffect, useMemo } from 'react';
