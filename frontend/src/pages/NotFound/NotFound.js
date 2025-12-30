import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="error-code">
          <span className="number">4</span>
          <span className="zero">0</span>
          <span className="number">4</span>
        </div>
        
        <div className="error-message">
          <h1>Page Not Found</h1>
          <p>Oops! The page you're looking for doesn't exist or has been moved.</p>
        </div>
        
        <div className="error-actions">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Go Back
          </button>
          <button onClick={() => navigate('/')} className="home-btn">
            🏠 Go Home
          </button>
          <button onClick={() => navigate('/products')} className="shop-btn">
            🛍️ Go Shopping
          </button>
        </div>
        
        <div className="error-help">
          <h3>Need Help?</h3>
          <div className="help-options">
            <div className="help-option">
              <div className="help-icon">🔍</div>
              <div className="help-text">
                <h4>Search Our Site</h4>
                <p>Use the search bar to find what you're looking for</p>
              </div>
            </div>
            
            <div className="help-option">
              <div className="help-icon">📞</div>
              <div className="help-text">
                <h4>Contact Support</h4>
                <p>Email: support@ecommerce.com</p>
                <p>Phone: +254 700 000 000</p>
              </div>
            </div>
            
            <div className="help-option">
              <div className="help-icon">🗺️</div>
              <div className="help-text">
                <h4>Site Navigation</h4>
                <p>Explore our popular pages:</p>
                <ul>
                  <li onClick={() => navigate('/products')}>Products</li>
                  <li onClick={() => navigate('/affiliate')}>Affiliate Program</li>
                  <li onClick={() => navigate('/boost')}>Boost Sales</li>
                  <li onClick={() => navigate('/dashboard')}>My Account</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="error-search">
          <h3>Search Our Website</h3>
          <div className="search-box">
            <input type="text" placeholder="What are you looking for?" />
            <button className="search-btn">🔍 Search</button>
          </div>
        </div>
        
        <div className="error-footer">
          <p>© 2024 E-Commerce Platform. All rights reserved.</p>
          <p>If you believe this is an error, please <a href="/contact">contact us</a>.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
