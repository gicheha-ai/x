import React, { createContext, useContext, useState, useEffect } from 'react';
import { productService } from '../../services';
import { rankProducts } from '../../utils/rankingAlgorithm';

const ProductContext = createContext({});

export const useProducts = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [boostedProducts, setBoostedProducts] = useState([]);
  const [superAdminProducts, setSuperAdminProducts] = useState([]);

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getAllProducts();
      
      if (response.success) {
        setProducts(response.data);
        categorizeProducts(response.data);
      }
    } catch (error) {
      setError('Failed to fetch products');
      console.error('Product fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeProducts = (productsList) => {
    const now = new Date();
    
    // Super admin products (gichehalawrence@gmail.com)
    const superAdmin = productsList.filter(p => 
      p.seller && p.seller.email === 'gichehalawrence@gmail.com'
    );
    setSuperAdminProducts(superAdmin);
    
    // Boosted products (active boosts)
    const boosted = productsList.filter(p => 
      p.boostData && 
      p.boostData.isActive && 
      new Date(p.boostData.expiresAt) > now
    );
    setBoostedProducts(boosted);
    
    // Featured products (top ranked excluding super admin)
    const featured = rankProducts(
      productsList.filter(p => 
        !p.seller || p.seller.email !== 'gichehalawrence@gmail.com'
      )
    ).slice(0, 12);
    setFeaturedProducts(featured);
  };

  const fetchCategories = async () => {
    try {
      const response = await productService.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Category fetch error:', error);
    }
  };

  const searchProducts = async (query, filters = {}) => {
    try {
      setLoading(true);
      const response = await productService.searchProducts(query, filters);
      
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      return { success: false, error: 'Search failed' };
    } finally {
      setLoading(false);
    }
  };

  const getProductById = async (productId) => {
    try {
      setLoading(true);
      const response = await productService.getProduct(productId);
      
      if (response.success) {
        return { success: true, product: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      return { success: false, error: 'Product not found' };
    } finally {
      setLoading(false);
    }
  };

  const getProductsByCategory = async (categoryId) => {
    try {
      setLoading(true);
      const response = await productService.getProductsByCategory(categoryId);
      
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.message };
    } catch (error) {
      return { success: false, error: 'Failed to fetch category products' };
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData) => {
    try {
      const response = await productService.createProduct(productData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to add product' };
    }
  };

  const updateProduct = async (productId, productData) => {
    try {
      const response = await productService.updateProduct(productId, productData);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to update product' };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      const response = await productService.deleteProduct(productId);
      return response;
    } catch (error) {
      return { success: false, error: 'Failed to delete product' };
    }
  };

  useEffect(() => {
    fetchAllProducts();
    fetchCategories();
  }, []);

  const value = {
    products,
    categories,
    featuredProducts,
    boostedProducts,
    superAdminProducts,
    loading,
    error,
    fetchAllProducts,
    searchProducts,
    getProductById,
    getProductsByCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    fetchCategories
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};