import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import './SideMenu.css';

const SideMenu = ({ onClose }) => {
  const [openSubmenus, setOpenSubmenus] = useState({
    payments: false,
    cart: false,
    me: false
  });
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const cartCount = cart ? cart.items.length : 0;

  const toggleSubmenu = (menu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  const handleMenuItemClick = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  return (
    <>
      <div className="overlay-background" onClick={onClose}></div>
      <div className="menu-overlay">
        <div className="menu-header">
          <div className="menu-title">Quick Navigation</div>
          <button className="close-menu" onClick={onClose}>×</button>
        </div>
        
        <div className="menu-user-profile">
          <div className="user-avatar">
            {user ? user.name?.charAt(0).toUpperCase() || 'U' : 'U'}
          </div>
          <div className="user-info">
            <h4>{user ? user.name || 'User' : 'Guest User'}</h4>
            <p>{user ? user.email || 'Logged in' : 'Not logged in'}</p>
          </div>
        </div>
        
        <div className="menu-section">
          <div className="menu-main-item" onClick={() => toggleSubmenu('payments')}>
            <span className="menu-icon">💰</span>
            <span className="menu-text">Payments</span>
            <span className="menu-arrow">{openSubmenus.payments ? '▲' : '▼'}</span>
          </div>
          <div className={`submenu ${openSubmenus.payments ? 'open' : ''}`}>
            <div className="menu-item" onClick={() => handleMenuItemClick('/dashboard/funds')}>
              <span className="submenu-icon">💳</span>
              <span className="menu-text">Funds</span>
              <span className="menu-description">Add/Withdraw money</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/dashboard/sales')}>
              <span className="submenu-icon">📊</span>
              <span className="menu-text">Sales</span>
              <span className="menu-description">Sales analytics & trends</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/affiliate')}>
              <span className="submenu-icon">🤝</span>
              <span className="menu-text">Affiliate Marketing</span>
              <span className="menu-description">Internal/External affiliates</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/boost')}>
              <span className="submenu-icon">🚀</span>
              <span className="menu-text">Boost Sales</span>
              <span className="menu-description">Boost payments per product</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/dashboard/orders')}>
              <span className="submenu-icon">📦</span>
              <span className="menu-text">Order</span>
              <span className="menu-description">Order management</span>
            </div>
          </div>
        </div>
        
        <div className="menu-section">
          <div className="menu-main-item" onClick={() => toggleSubmenu('cart')}>
            <span className="menu-icon">🛒</span>
            <span className="menu-text">Cart</span>
            {cartCount > 0 && <span className="menu-badge">{cartCount}</span>}
            <span className="menu-arrow">{openSubmenus.cart ? '▲' : '▼'}</span>
          </div>
          <div className={`submenu ${openSubmenus.cart ? 'open' : ''}`}>
            <div className="menu-item" onClick={() => handleMenuItemClick('/products/trending')}>
              <span className="submenu-icon">🔥</span>
              <span className="menu-text">Trending Products</span>
              <span className="menu-description">Ranked by boost sales</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/sellers/trending')}>
              <span className="submenu-icon">👑</span>
              <span className="menu-text">Trending Sellers</span>
              <span className="menu-description">Top sellers by boost</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/dashboard/wishlist')}>
              <span className="submenu-icon">❤️</span>
              <span className="menu-text">Wish List</span>
              <span className="menu-description">Saved for later purchase</span>
            </div>
          </div>
        </div>
        
        <div className="menu-section">
          <div className="menu-main-item" onClick={() => toggleSubmenu('me')}>
            <span className="menu-icon">👤</span>
            <span className="menu-text">Me</span>
            <span className="menu-arrow">{openSubmenus.me ? '▲' : '▼'}</span>
          </div>
          <div className={`submenu ${openSubmenus.me ? 'open' : ''}`}>
            <div className="menu-item" onClick={() => handleMenuItemClick('/affiliate')}>
              <span className="submenu-icon">🔗</span>
              <span className="menu-text">Affiliate Marketing</span>
              <span className="menu-description">Find work or promote</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/products/discover')}>
              <span className="submenu-icon">🔍</span>
              <span className="menu-text">Discover</span>
              <span className="menu-description">Personalized recommendations</span>
            </div>
            <div className="menu-item" onClick={() => handleMenuItemClick('/dashboard/store')}>
              <span className="submenu-icon">🏪</span>
              <span className="menu-text">My Store</span>
              <span className="menu-description">Create & manage store</span>
            </div>
          </div>
        </div>
        
        <div className="menu-footer">
          <p>© 2024 E-Commerce Platform</p>
          <p>Quick Access Menu</p>
        </div>
        
        {user && (
          <div className="menu-logout">
            <button className="logout-button" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SideMenu;
