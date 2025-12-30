import React, { createContext, useContext, useState, useEffect } from 'react';
import { orderService } from '../../services';

const CartContext = createContext({});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const savedCart = localStorage.getItem('ecommerce_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCartItems(parsedCart);
        calculateCartTotals(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('ecommerce_cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem('ecommerce_cart', JSON.stringify(cartItems));
    } else {
      localStorage.removeItem('ecommerce_cart');
    }
  }, [cartItems]);

  const calculateCartTotals = (items) => {
    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    const count = items.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);
    
    setCartTotal(total);
    setCartCount(count);
  };

  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
      
      let newItems;
      if (existingItemIndex > -1) {
        // Update quantity if item already exists
        newItems = [...prevItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
      } else {
        // Add new item to cart
        const cartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || '/placeholder-product.jpg',
          quantity: quantity,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          productId: product._id || product.id,
          category: product.category,
          stock: product.stock || 999,
          boostLevel: product.boostLevel || 0,
          isSuperAdminProduct: product.sellerEmail === 'gichehalawrence@gmail.com'
        };
        newItems = [...prevItems, cartItem];
      }
      
      calculateCartTotals(newItems);
      return newItems;
    });
    
    // Show notification
    showCartNotification(product.name, quantity);
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== productId);
      calculateCartTotals(newItems);
      return newItems;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === productId ? { ...item, quantity } : item
      );
      calculateCartTotals(newItems);
      return newItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setCartTotal(0);
    setCartCount(0);
    localStorage.removeItem('ecommerce_cart');
  };

  const showCartNotification = (productName, quantity) => {
    // Create custom notification (you can integrate with a notification library)
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span>✓ Added ${quantity} ${quantity > 1 ? 'items' : 'item'} of "${productName}" to cart</span>
        <a href="/cart">View Cart</a>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  const getCartSummary = () => {
    const subtotal = cartTotal;
    const shipping = cartTotal > 0 ? (cartTotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.08; // 8% transaction fee
    const total = subtotal + shipping + tax;
    
    return {
      subtotal,
      shipping,
      tax,
      total,
      itemCount: cartCount
    };
  };

  const createOrder = async (orderData) => {
    try {
      setLoading(true);
      
      const orderPayload = {
        ...orderData,
        items: cartItems,
        total: cartTotal,
        summary: getCartSummary()
      };
      
      const response = await orderService.createOrder(orderPayload);
      
      if (response.success) {
        // Clear cart after successful order
        clearCart();
        return { success: true, order: response.order };
      } else {
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Order creation error:', error);
      return { success: false, error: 'Failed to create order' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cartItems,
    cartTotal,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSummary,
    createOrder
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
