import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useCart } from '../../../hooks/useCart';
import SearchBar from '../SearchBar/SearchBar';
import SideMenu from '../SideMenu/SideMenu';
import './Header.css';

const Header = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const cartCount = cart ? cart.items.length : 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo" onClick={() => navigate('/')}>
          <h1>🛒 E-Commerce</h1>
        </div>
        
        <div className="header-actions">
          <button className="search-btn" onClick={() => setShowSearch(true)}>
            🔍 Search
          </button>
          
          <div className="cart-icon" onClick={() => navigate('/cart')}>
            🛒
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </div>
          
          <div className="user-menu">
            {user ? (
              <div className="user-info" onClick={() => navigate('/dashboard')}>
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-name">{user.name || 'User'}</span>
              </div>
            ) : (
              <button className="login-btn" onClick={() => navigate('/login')}>
                👤 Login
              </button>
            )}
          </div>
          
          <button className="menu-btn" onClick={() => setShowMenu(true)}>
            ☰ Menu
          </button>
        </div>
      </div>

      {showSearch && <SearchBar onClose={() => setShowSearch(false)} />}
      {showMenu && <SideMenu onClose={() => setShowMenu(false)} />}
    </header>
  );
};

export default Header;