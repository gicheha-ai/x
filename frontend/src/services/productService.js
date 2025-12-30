import { productApi } from './api';

export const productService = {
  getAllProducts: async (params = {}) => {
    try {
      const response = await productApi.getAllProducts(params);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch products' };
    }
  },

  getProduct: async (productId) => {
    try {
      const response = await productApi.getProduct(productId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Product not found' };
    }
  },

  createProduct: async (productData) => {
    try {
      const response = await productApi.createProduct(productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create product' };
    }
  },

  updateProduct: async (productId, productData) => {
    try {
      const response = await productApi.updateProduct(productId, productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update product' };
    }
  },

  deleteProduct: async (productId) => {
    try {
      const response = await productApi.deleteProduct(productId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete product' };
    }
  },

  searchProducts: async (query, filters = {}) => {
    try {
      const response = await productApi.searchProducts(query, filters);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Search failed' };
    }
  },

  getCategories: async () => {
    try {
      const response = await productApi.getCategories();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch categories' };
    }
  },

  getProductsByCategory: async (categoryId) => {
    try {
      const response = await productApi.getProductsByCategory(categoryId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch category products' };
    }
  },

  getBoostedProducts: async () => {
    try {
      const response = await productApi.getBoostedProducts();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch boosted products' };
    }
  },

  getSuperAdminProducts: async () => {
    try {
      const response = await productApi.getSuperAdminProducts();
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch super admin products' };
    }
  },

  uploadProductImage: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/products/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw { success: false, message: 'Image upload failed' };
    }
  },

  // Helper methods
  formatPrice: (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  },

  calculateDiscount: (originalPrice, salePrice) => {
    if (!originalPrice || !salePrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  },

  validateProductData: (productData) => {
    const errors = [];
    
    if (!productData.name || productData.name.trim().length < 3) {
      errors.push('Product name must be at least 3 characters');
    }
    
    if (!productData.description || productData.description.trim().length < 10) {
      errors.push('Product description must be at least 10 characters');
    }
    
    if (!productData.price || productData.price <= 0) {
      errors.push('Product price must be greater than 0');
    }
    
    if (!productData.category) {
      errors.push('Please select a category');
    }
    
    if (!productData.stock || productData.stock < 0) {
      errors.push('Stock must be 0 or greater');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
