import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import ProductCard from '../../components/ProductCard/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './CartPage.css';

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = () => {
    if (!user) {
      alert('Please login to checkout');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  const handleRemoveItem = (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      removeFromCart(itemId);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 50 ? 0 : 5.99; // Free shipping over $50
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateShipping();
  };

  if (loading) {
    return <LoadingSpinner text="Loading cart..." />;
  }

  return (
    <div className="cart-page">
      <div className="page-header">
        <h1>🛒 Shopping Cart</h1>
        <p>Review your items and proceed to checkout</p>
      </div>

      {cart.items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <button className="shop-btn" onClick={() => navigate('/products')}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="cart-container">
          {/* Cart Items */}
          <div className="cart-items">
            <div className="cart-header">
              <h2>Cart Items ({cart.items.length})</h2>
              <button className="clear-cart-btn" onClick={clearCart}>
                Clear Cart
              </button>
            </div>

            <div className="items-list">
              {cart.items.map((item, index) => (
                <div key={item.id || index} className="cart-item">
                  <div className="item-image">
                    <img src={item.image || 'https://via.placeholder.com/100x100'} alt={item.name} />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-category">{item.category}</p>
                    <div className="item-seller">
                      <span className="seller-icon">👤</span>
                      <span>{item.seller || 'Unknown Seller'}</span>
                    </div>
                    <div className="item-boost">
                      <span className="boost-icon">🚀</span>
                      <span>{item.boostSales || 0} Boost Sales</span>
                    </div>
                  </div>
                  <div className="item-quantity">
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuantityChange(item.id, Math.max(1, value));
                      }}
                      min="1"
                      className="qty-input"
                    />
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-price">
                    <div className="price">${(item.price * item.quantity).toFixed(2)}</div>
                    <div className="unit-price">${item.price.toFixed(2)} each</div>
                  </div>
                  <button 
                    className="remove-item-btn"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Cart Actions */}
            <div className="cart-actions">
              <button className="continue-shopping" onClick={() => navigate('/products')}>
                ← Continue Shopping
              </button>
              <button className="update-cart" onClick={() => fetchCart()}>
                Update Cart
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-card">
              <h2>Order Summary</h2>
              
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal ({cart.items.length} items)</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Tax (8%)</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>
                    {calculateShipping() === 0 ? 'FREE' : `$${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                
                {calculateSubtotal() < 50 && (
                  <div className="free-shipping-note">
                    <span className="shipping-icon">🚚</span>
                    Add ${(50 - calculateSubtotal()).toFixed(2)} more for FREE shipping!
                  </div>
                )}
              </div>

              <button 
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={!user}
              >
                {user ? 'Proceed to Checkout' : 'Login to Checkout'}
              </button>

              <div className="payment-methods">
                <p>💳 Secure payment with:</p>
                <div className="payment-icons">
                  <span>💳</span>
                  <span>📱</span>
                  <span>🏦</span>
                  <span>📘</span>
                </div>
              </div>

              <div className="cart-benefits">
                <h3>🛡️ Shopping Benefits</h3>
                <ul>
                  <li>✅ Free shipping on orders over $50</li>
                  <li>✅ 30-day return policy</li>
                  <li>✅ Secure payment processing</li>
                  <li>✅ Buyer protection</li>
                </ul>
              </div>

              {/* Wishlist Section */}
              <div className="wishlist-section">
                <h3>❤️ Wishlist</h3>
                <p>Save items for later purchase</p>
                <button className="view-wishlist-btn" onClick={() => navigate('/dashboard/wishlist')}>
                  View Wishlist →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {cart.items.length > 0 && (
        <div className="recently-viewed">
          <h2>👀 You Might Also Like</h2>
          <div className="suggested-products">
            {/* Add suggested products here */}
            <p className="no-suggestions">
              Based on your cart items, we'll show you personalized recommendations here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;