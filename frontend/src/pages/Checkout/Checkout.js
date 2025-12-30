import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../../hooks/useCart';
import PaymentMethods from '../../components/PaymentMethods/PaymentMethods';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Kenya',
    postalCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    if (!cart || cart.items.length === 0) {
      navigate('/cart');
      return;
    }

    // Pre-fill user info
    setShippingInfo(prev => ({
      ...prev,
      fullName: user.name || '',
      email: user.email || '',
      phone: user.phone || ''
    }));
  }, [user, cart, navigate]);

  const calculateTotal = () => {
    if (!cart) return 0;
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateShippingInfo = () => {
    const requiredFields = ['fullName', 'email', 'phone', 'address', 'city'];
    for (const field of requiredFields) {
      if (!shippingInfo[field]?.trim()) {
        alert(`Please fill in your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingInfo.email)) {
      alert('Please enter a valid email address');
      return false;
    }

    // Validate phone (Kenyan format)
    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    if (!phoneRegex.test(shippingInfo.phone.replace(/\s/g, ''))) {
      alert('Please enter a valid Kenyan phone number');
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateShippingInfo()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (paymentMethod) {
        setStep(3);
      } else {
        alert('Please select a payment method');
      }
    }
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handlePaymentSuccess = async (paymentData) => {
    setLoading(true);
    try {
      // Simulate API call to create order
      const orderData = {
        items: cart.items,
        shippingInfo,
        paymentMethod: paymentData.method,
        paymentDetails: paymentData,
        totalAmount: calculateTotal(),
        userId: user._id,
        userEmail: user.email
      };

      // In a real app, you would send this to your backend
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const order = await response.json();
        setOrderId(order._id);
        setOrderComplete(true);
        clearCart();
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      alert('Failed to complete order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    alert(`Payment error: ${error}`);
  };

  if (!user || !cart) {
    return <LoadingSpinner text="Loading checkout..." />;
  }

  if (orderComplete) {
    return (
      <div className="checkout-container">
        <div className="order-success">
          <div className="success-icon">✅</div>
          <h1>Order Confirmed!</h1>
          <p className="order-id">Order ID: {orderId || 'ORD-' + Date.now()}</p>
          
          <div className="success-details">
            <h2>Thank you for your purchase!</h2>
            <p>Your order has been successfully placed.</p>
            <p>A confirmation email has been sent to {shippingInfo.email}</p>
            
            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-items">
                {cart.items.map((item, index) => (
                  <div key={index} className="summary-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <strong>Total:</strong>
                <strong>${calculateTotal().toFixed(2)}</strong>
              </div>
            </div>

            <div className="shipping-info">
              <h3>Shipping Information</h3>
              <p><strong>Name:</strong> {shippingInfo.fullName}</p>
              <p><strong>Address:</strong> {shippingInfo.address}, {shippingInfo.city}</p>
              <p><strong>Phone:</strong> {shippingInfo.phone}</p>
            </div>
          </div>

          <div className="success-actions">
            <button 
              onClick={() => navigate('/dashboard/orders')}
              className="view-orders-btn"
            >
              📦 View My Orders
            </button>
            <button 
              onClick={() => navigate('/')}
              className="continue-shopping-btn"
            >
              🛍️ Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Checkout</h1>
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Shipping Info</div>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Payment</div>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Confirmation</div>
          </div>
        </div>
      </div>

      <div className="checkout-content">
        <div className="checkout-main">
          {step === 1 && (
            <div className="shipping-form">
              <h2>Shipping Information</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={shippingInfo.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={shippingInfo.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleInputChange}
                    placeholder="0712 345 678"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address">Address *</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    placeholder="Street address, building, apartment"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={shippingInfo.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    name="country"
                    value={shippingInfo.country}
                    onChange={handleInputChange}
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Tanzania">Tanzania</option>
                    <option value="Rwanda">Rwanda</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="postalCode">Postal Code</label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={shippingInfo.postalCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="payment-section">
              <h2>Select Payment Method</h2>
              <PaymentMethods
                amount={calculateTotal()}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                selectedMethod={paymentMethod}
                onMethodSelect={setPaymentMethod}
              />
            </div>
          )}

          {step === 3 && (
            <div className="confirmation-section">
              <h2>Confirm Your Order</h2>
              {loading ? (
                <LoadingSpinner text="Processing your order..." />
              ) : (
                <div className="order-review">
                  <div className="review-shipping">
                    <h3>Shipping Information</h3>
                    <p><strong>Name:</strong> {shippingInfo.fullName}</p>
                    <p><strong>Email:</strong> {shippingInfo.email}</p>
                    <p><strong>Phone:</strong> {shippingInfo.phone}</p>
                    <p><strong>Address:</strong> {shippingInfo.address}, {shippingInfo.city}</p>
                  </div>

                  <div className="review-payment">
                    <h3>Payment Method</h3>
                    <p><strong>Selected:</strong> {paymentMethod}</p>
                  </div>

                  <div className="review-total">
                    <h3>Order Total</h3>
                    <p><strong>Amount to pay:</strong> ${calculateTotal().toFixed(2)}</p>
                  </div>

                  <button 
                    onClick={handlePaymentSuccess}
                    className="confirm-order-btn"
                  >
                    ✅ Confirm & Pay Now
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="checkout-navigation">
            {step > 1 && (
              <button 
                onClick={handlePreviousStep}
                className="back-btn"
              >
                ← Back
              </button>
            )}
            {step < 3 && (
              <button 
                onClick={handleNextStep}
                className="next-btn"
              >
                {step === 1 ? 'Continue to Payment →' : 'Review Order →'}
              </button>
            )}
          </div>
        </div>

        <div className="checkout-sidebar">
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-items">
              {cart.items.map((item, index) => (
                <div key={index} className="summary-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">x {item.quantity}</span>
                  </div>
                  <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="secure-checkout">
            <div className="secure-icon">🔒</div>
            <p>Secure Checkout</p>
            <small>Your payment information is encrypted and secure</small>
          </div>

          <div className="need-help">
            <h4>Need Help?</h4>
            <p>Contact us: support@ecommerce.com</p>
            <p>Phone: +254 700 000 000</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
