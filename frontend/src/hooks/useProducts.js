import { useContext } from 'react';
import { ProductContext } from '../context/ProductContext';
import { productService } from '../services';
import { rankProducts, categorizeProducts } from '../utils/rankingAlgorithm';

/**
 * Custom hook for product functionality
 */
export const useProducts = () => {
  const context = useContext(ProductContext);
  
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  
  return context;
};

/**
 * Hook to get product by ID
 */
export const useProduct = (productId) => {
  const { products, getProductById } = useProducts();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);
  
  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getProductById(productId);
      
      if (result.success) {
        setProduct(result.product);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };
  
  const refetch = () => {
    fetchProduct();
  };
  
  return {
    product,
    loading,
    error,
    refetch,
    isSuperAdminProduct: product?.seller?.email === 'gichehalawrence@gmail.com'
  };
};

/**
 * Hook for product search
 */
export const useProductSearch = (initialQuery = '', initialFilters = {}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(initialFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const { searchProducts: searchProductsService } = useProducts();
  
  const search = async (searchQuery = query, searchFilters = filters, pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await searchProductsService(searchQuery, {
        ...searchFilters,
        page: pageNum,
        limit: 20
      });
      
      if (result.success) {
        setResults(result.data.products || []);
        setTotal(result.data.total || 0);
        setTotalPages(result.data.totalPages || 1);
        setPage(pageNum);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  const updateQuery = (newQuery) => {
    setQuery(newQuery);
  };
  
  const updateFilters = (newFilters) => {
    setFilters(newFilters);
  };
  
  const nextPage = () => {
    if (page < totalPages) {
      search(query, filters, page + 1);
    }
  };
  
  const prevPage = () => {
    if (page > 1) {
      search(query, filters, page - 1);
    }
  };
  
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      search(query, filters, pageNum);
    }
  };
  
  useEffect(() => {
    if (query || Object.keys(filters).length > 0) {
      const debounceTimer = setTimeout(() => {
        search(query, filters, 1);
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [query, filters]);
  
  const rankedResults = useMemo(() => {
    return rankProducts(results);
  }, [results]);
  
  return {
    query,
    results: rankedResults,
    loading,
    error,
    total,
    page,
    totalPages,
    filters,
    updateQuery,
    updateFilters,
    search: () => search(query, filters, 1),
    nextPage,
    prevPage,
    goToPage,
    refresh: () => search(query, filters, page)
  };
};

/**
 * Hook for product categories
 */
export const useCategories = () => {
  const { categories, fetchCategories } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadCategoryProducts = async (categoryId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await productService.getProductsByCategory(categoryId);
      
      if (result.success) {
        setCategoryProducts(result.data);
        setSelectedCategory(categoryId);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load category products');
    } finally {
      setLoading(false);
    }
  };
  
  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId);
  };
  
  const getCategoryByName = (categoryName) => {
    return categories.find(cat => cat.name === categoryName);
  };
  
  const getCategoryStats = (categoryId) => {
    const category = getCategoryById(categoryId);
    const productsInCategory = categoryProducts.filter(p => p.category === categoryId);
    
    return {
      productCount: productsInCategory.length,
      averagePrice: productsInCategory.reduce((sum, p) => sum + p.price, 0) / (productsInCategory.length || 1),
      totalSales: productsInCategory.reduce((sum, p) => sum + (p.salesCount || 0), 0),
      topRated: productsInCategory.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))[0],
      mostPopular: productsInCategory.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))[0]
    };
  };
  
  return {
    categories,
    selectedCategory,
    categoryProducts,
    loading,
    error,
    loadCategoryProducts,
    getCategoryById,
    getCategoryByName,
    getCategoryStats,
    refreshCategories: fetchCategories
  };
};

/**
 * Hook for featured products
 */
export const useFeaturedProducts = () => {
  const { featuredProducts, boostedProducts, superAdminProducts } = useProducts();
  
  const getFeaturedByType = (type) => {
    switch (type) {
      case 'boosted':
        return boostedProducts;
      case 'superAdmin':
        return superAdminProducts;
      case 'trending':
        return featuredProducts.filter(p => 
          !p.boostData || !p.boostData.isActive
        );
      default:
        return featuredProducts;
    }
  };
  
  const getHomepageSections = () => {
    return {
      superAdminProducts: {
        title: 'Featured by Admin',
        products: superAdminProducts.slice(0, 8),
        icon: '⚡',
        color: '#f59e0b'
      },
      boostedProducts: {
        title: 'Boosted Products',
        products: boostedProducts.slice(0, 8),
        icon: '🚀',
        color: '#10b981'
      },
      trendingProducts: {
        title: 'Trending Now',
        products: featuredProducts
          .filter(p => !p.boostData || !p.boostData.isActive)
          .slice(0, 8),
        icon: '📈',
        color: '#3b82f6'
      },
      newArrivals: {
        title: 'New Arrivals',
        products: featuredProducts
          .filter(p => {
            const createdAt = new Date(p.createdAt);
            const daysOld = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
            return daysOld <= 7;
          })
          .slice(0, 8),
        icon: '🆕',
        color: '#8b5cf6'
      }
    };
  };
  
  return {
    featuredProducts,
    boostedProducts,
    superAdminProducts,
    getFeaturedByType,
    getHomepageSections
  };
};

/**
 * Hook for product management (for sellers)
 */
export const useProductManagement = () => {
  const { addProduct, updateProduct, deleteProduct } = useProducts();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  
  const createNewProduct = async (productData) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      const result = await addProduct(productData);
      
      if (result.success) {
        return {
          success: true,
          product: result.data,
          message: 'Product created successfully'
        };
      } else {
        setActionError(result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      setActionError('Failed to create product');
      return {
        success: false,
        error: 'Failed to create product'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  const editProduct = async (productId, productData) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      const result = await updateProduct(productId, productData);
      
      if (result.success) {
        return {
          success: true,
          product: result.data,
          message: 'Product updated successfully'
        };
      } else {
        setActionError(result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      setActionError('Failed to update product');
      return {
        success: false,
        error: 'Failed to update product'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  const removeProduct = async (productId) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      const result = await deleteProduct(productId);
      
      if (result.success) {
        return {
          success: true,
          message: 'Product deleted successfully'
        };
      } else {
        setActionError(result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      setActionError('Failed to delete product');
      return {
        success: false,
        error: 'Failed to delete product'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  const duplicateProduct = async (productId) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      // First get the product
      const productResult = await productService.getProduct(productId);
      
      if (!productResult.success) {
        setActionError(productResult.error);
        return {
          success: false,
          error: productResult.error
        };
      }
      
      // Create a copy with modified data
      const product = productResult.data;
      const duplicateData = {
        ...product,
        name: `${product.name} (Copy)`,
        sku: `${product.sku}-COPY-${Date.now()}`,
        status: 'draft'
      };
      
      // Remove ID and timestamps
      delete duplicateData._id;
      delete duplicateData.id;
      delete duplicateData.createdAt;
      delete duplicateData.updatedAt;
      
      const result = await addProduct(duplicateData);
      
      if (result.success) {
        return {
          success: true,
          product: result.data,
          message: 'Product duplicated successfully'
        };
      } else {
        setActionError(result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      setActionError('Failed to duplicate product');
      return {
        success: false,
        error: 'Failed to duplicate product'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  const changeProductStatus = async (productId, status) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      const result = await updateProduct(productId, { status });
      
      if (result.success) {
        return {
          success: true,
          message: `Product ${status} successfully`
        };
      } else {
        setActionError(result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      setActionError('Failed to change product status');
      return {
        success: false,
        error: 'Failed to change product status'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  const bulkUpdateProducts = async (productIds, updates) => {
    try {
      setActionLoading(true);
      setActionError(null);
      
      // This would be a bulk API call in production
      const results = await Promise.all(
        productIds.map(productId => updateProduct(productId, updates))
      );
      
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        setActionError(`${failed.length} products failed to update`);
        return {
          success: false,
          error: `${failed.length} products failed to update`,
          failed
        };
      }
      
      return {
        success: true,
        message: `${productIds.length} products updated successfully`
      };
    } catch (error) {
      setActionError('Bulk update failed');
      return {
        success: false,
        error: 'Bulk update failed'
      };
    } finally {
      setActionLoading(false);
    }
  };
  
  return {
    createProduct: createNewProduct,
    editProduct,
    deleteProduct: removeProduct,
    duplicateProduct,
    changeProductStatus,
    bulkUpdateProducts,
    loading: actionLoading,
    error: actionError,
    clearError: () => setActionError(null)
  };
};

// Import useState, useEffect, useMemo if needed at top of file
import { useState, useEffect, useMemo } from 'react';