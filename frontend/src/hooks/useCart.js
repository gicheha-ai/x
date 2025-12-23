import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

/**
 * Custom hook for cart functionality
 */
export const useCart = () => {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
};

/**
 * Hook to get cart summary
 */
export const useCartSummary = () => {
  const { cartItems, cartTotal, cartCount } = useCart();
  
  const calculateSummary = () => {
    const subtotal = cartTotal;
    const shipping = cartTotal > 0 ? (cartTotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08; // 8% transaction fee
    const total = subtotal + shipping + tax;
    
    return {
      subtotal,
      shipping,
      tax,
      total,
      itemCount: cartCount,
      items: cartItems
    };
  };
  
  return calculateSummary();
};

/**
 * Hook for cart actions
 */
export const useCartActions = () => {
  const { addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  
  const addItem = (product, quantity = 1) => {
    if (!product) {
      return { success: false, error: 'Product is required' };
    }
    
    if (quantity < 1) {
      return { success: false, error: 'Quantity must be at least 1' };
    }
    
    // Check stock availability
    if (product.stock !== undefined && quantity > product.stock) {
      return {
        success: false,
        error: `Only ${product.stock} items available in stock`
      };
    }
    
    addToCart(product, quantity);
    
    return {
      success: true,
      message: `Added ${quantity} ${quantity > 1 ? 'items' : 'item'} to cart`
    };
  };
  
  const removeItem = (productId) => {
    if (!productId) {
      return { success: false, error: 'Product ID is required' };
    }
    
    removeFromCart(productId);
    
    return {
      success: true,
      message: 'Item removed from cart'
    };
  };
  
  const updateItemQuantity = (productId, quantity) => {
    if (!productId) {
      return { success: false, error: 'Product ID is required' };
    }
    
    if (quantity < 0) {
      return { success: false, error: 'Quantity cannot be negative' };
    }
    
    if (quantity === 0) {
      removeFromCart(productId);
      return {
        success: true,
        message: 'Item removed from cart'
      };
    }
    
    updateQuantity(productId, quantity);
    
    return {
      success: true,
      message: 'Quantity updated'
    };
  };
  
  const clearAllItems = () => {
    clearCart();
    
    return {
      success: true,
      message: 'Cart cleared'
    };
  };
  
  const getCartItem = (productId) => {
    const { cartItems } = useCart();
    return cartItems.find(item => item.id === productId);
  };
  
  const isInCart = (productId) => {
    const { cartItems } = useCart();
    return cartItems.some(item => item.id === productId);
  };
  
  const getItemQuantity = (productId) => {
    const item = getCartItem(productId);
    return item ? item.quantity : 0;
  };
  
  return {
    addItem,
    removeItem,
    updateItemQuantity,
    clearAllItems,
    getCartItem,
    isInCart,
    getItemQuantity
  };
};

/**
 * Hook to check cart validation
 */
export const useCartValidation = () => {
  const { cartItems } = useCart();
  
  const validateCart = () => {
    const errors = [];
    const warnings = [];
    
    if (cartItems.length === 0) {
      errors.push('Cart is empty');
      return { isValid: false, errors, warnings };
    }
    
    // Check for out of stock items
    cartItems.forEach(item => {
      if (item.stock !== undefined && item.quantity > item.stock) {
        errors.push(`${item.name} is out of stock (available: ${item.stock})`);
      }
    });
    
    // Check for price changes
    // This would normally compare with current prices from API
    cartItems.forEach(item => {
      if (item.originalPrice && item.price !== item.originalPrice) {
        warnings.push(`Price changed for ${item.name}`);
      }
    });
    
    // Check for seller availability
    const sellers = new Set(cartItems.map(item => item.sellerId));
    if (sellers.size > 3) {
      warnings.push('Items from multiple sellers may have separate shipping');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      itemCount: cartItems.length,
      sellerCount: sellers.size
    };
  };
  
  return validateCart;
};

/**
 * Hook for cart persistence
 */
export const useCartPersistence = () => {
  const { cartItems } = useCart();
  
  const saveCartToServer = async () => {
    try {
      // This would call an API to save cart to user account
      const cartData = {
        items: cartItems,
        savedAt: new Date().toISOString()
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Cart saved successfully',
        data: cartData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save cart'
      };
    }
  };
  
  const loadCartFromServer = async () => {
    try {
      // This would call an API to load saved cart
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, return empty array
      return {
        success: true,
        message: 'Cart loaded successfully',
        items: []
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to load cart'
      };
    }
  };
  
  const mergeCarts = async (serverCart) => {
    try {
      // Merge local cart with server cart
      const mergedItems = [...cartItems];
      
      serverCart.items.forEach(serverItem => {
        const existingIndex = mergedItems.findIndex(item => item.id === serverItem.id);
        
        if (existingIndex > -1) {
          // Use higher quantity
          mergedItems[existingIndex].quantity = Math.max(
            mergedItems[existingIndex].quantity,
            serverItem.quantity
          );
        } else {
          mergedItems.push(serverItem);
        }
      });
      
      return {
        success: true,
        message: 'Carts merged successfully',
        items: mergedItems
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to merge carts'
      };
    }
  };
  
  return {
    saveCartToServer,
    loadCartFromServer,
    mergeCarts
  };
};