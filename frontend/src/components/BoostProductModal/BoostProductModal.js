import React, { useState } from 'react';
import './BoostProductModal.css';

const BoostProductModal = ({ product, onClose, onBoost }) => {
  const [selectedDuration, setSelectedDuration] = useState('daily');
  const [loading, setLoading] = useState(false);

  const pricing = {
    daily: { price: 10, duration: '1 day', description: 'Top of category for 24 hours' },
    weekly: { price: 50, duration: '7 days', description: 'Featured placement for a week', savings: 'Save $20' },
    monthly: { price: 150, duration: '30 days', description: 'Premium visibility for a month', savings: 'Save $150' }
  };

  const handleBoost = async () => {
    setLoading(true);
    try {
      await onBoost(product.id, selectedDuration, pricing[selectedDuration].price);
      onClose();
    } catch (error) {
      console.error('Boost failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="boost-modal-overlay">
      <div className="boost-modal">
        <button className="close-modal" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>🚀 Boost Your Product</h2>
          <p>Increase visibility and sales for "{product.name}"</p>
        </div>

        <div className="product-info">
          <div className="product-preview">
            {product.image && (
              <img src={product.image} alt={product.name} />
            )}
            <div className="product-details">
              <h3>{product.name}</h3>
              <p className="product-category">{product.category}</p>
              <p className="current-boost">
                Current Boost: <span>{product.boostSales || 0} sales</span>
              </p>
            </div>
          </div>
        </div>

        <div className="boost-options">
          <h3>Select Boost Duration:</h3>
          <div className="duration-options">
            {Object.entries(pricing).map(([duration, info]) => (
              <div
                key={duration}
                className={`duration-option ${selectedDuration === duration ? 'selected' : ''}`}
                onClick={() => setSelectedDuration(duration)}
              >
                <div className="duration-header">
                  <span className="duration-title">
                    {duration.charAt(0).toUpperCase() + duration.slice(1)}
                  </span>
                  {info.savings && (
                    <span className="savings-badge">{info.savings}</span>
                  )}
                </div>
                <div className="duration-price">${info.price}</div>
                <div className="duration-info">{info.duration}</div>
                <div className="duration-description">{info.description}</div>
                <div className="features">
                  {duration === 'daily' && (
                    <>
                      <span>✅ Top of category</span>
                      <span>✅ Search priority</span>
                    </>
                  )}
                  {duration === 'weekly' && (
                    <>
                      <span>✅ All daily features</span>
                      <span>✅ Featured section</span>
                      <span>✅ Email promotion</span>
                    </>
                  )}
                  {duration === 'monthly' && (
                    <>
                      <span>✅ All weekly features</span>
                      <span>✅ Homepage banner</span>
                      <span>✅ Affiliate promotion</span>
                      <span>✅ Priority support</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="payment-summary">
          <h3>Payment Summary</h3>
          <div className="summary-details">
            <div className="summary-row">
              <span>Boost Duration:</span>
              <span>{pricing[selectedDuration].duration}</span>
            </div>
            <div className="summary-row">
              <span>Boost Price:</span>
              <span className="price">${pricing[selectedDuration].price}</span>
            </div>
            <div className="summary-row total">
              <span>Total to Pay:</span>
              <span className="total-price">${pricing[selectedDuration].price}</span>
            </div>
          </div>
        </div>

        <div className="payment-methods">
          <h3>Payment Method</h3>
          <div className="method-options">
            <button className="method-option selected">
              💳 Credit/Debit Card
            </button>
            <button className="method-option">
              📱 Airtel Money
            </button>
            <button className="method-option">
              🏦 Bank Transfer
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="boost-button"
            onClick={handleBoost}
            disabled={loading}
          >
            {loading ? 'Processing...' : `Boost Now - $${pricing[selectedDuration].price}`}
          </button>
        </div>

        <div className="boost-benefits">
          <h4>🌟 Boost Benefits:</h4>
          <ul>
            <li>Increased product visibility by up to 300%</li>
            <li>Priority placement in search results</li>
            <li>Featured in trending products section</li>
            <li>Higher conversion rates</li>
            <li>Detailed analytics dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BoostProductModal;