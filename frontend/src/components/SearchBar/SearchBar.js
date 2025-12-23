import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

const SearchBar = ({ onClose }) => {
  const [currentTab, setCurrentTab] = useState('product-categories');
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Mock data from your m.txt file
  const searchData = {
    'product-categories': {
      'Electronics': {
        products: [
          { name: "iPhone 15 Pro", url: "/products/iphone-15/", boostSales: 500, uploadDate: '2024-01-15' },
          { name: "Samsung TV", url: "/products/samsung-tv/", boostSales: 300, uploadDate: '2024-01-10' },
          { name: "MacBook Air", url: "/products/macbook-air/", boostSales: 500, uploadDate: '2024-01-05' },
          { name: "Wireless Earbuds", url: "/products/earbuds/", boostSales: 200, uploadDate: '2024-01-20' }
        ],
        icon: "📱"
      },
      'Clothing': {
        products: [
          { name: "Nike Air Max", url: "/products/nike-air-max/", boostSales: 400, uploadDate: '2024-01-12' },
          { name: "Leather Jacket", url: "/products/leather-jacket/", boostSales: 150, uploadDate: '2024-01-08' },
          { name: "Designer Dress", url: "/products/designer-dress/", boostSales: 400, uploadDate: '2024-01-03' }
        ],
        icon: "👕"
      },
      'Books': {
        products: [
          { name: "Python Programming", url: "/products/python-book/", boostSales: 100, uploadDate: '2024-01-18' },
          { name: "Business Strategy", url: "/products/business-book/", boostSales: 80, uploadDate: '2024-01-14' }
        ],
        icon: "📚"
      }
    },
    'accounts': {
      users: [
        { username: "tech_guru", displayName: "Tech Guru", products: ['Electronics', 'Gadgets'], boostSales: 1000, joinDate: '2023-12-01' },
        { username: "fashionista", displayName: "Sarah Style", products: ['Clothing', 'Accessories'], boostSales: 800, joinDate: '2023-11-15' },
        { username: "book_worm", displayName: "Book Lover", products: ['Books', 'Educational'], boostSales: 300, joinDate: '2024-01-05' },
        { username: "gadget_master", displayName: "Mike Tech", products: ['Electronics', 'Clothing'], boostSales: 600, joinDate: '2023-12-20' },
        { username: "premium_seller", displayName: "Premium Seller", products: ['Electronics', 'Books', 'Clothing'], boostSales: 1200, joinDate: '2023-10-01' }
      ],
      icon: "👤"
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (searchInput.trim() === '') {
      generateDefaultSuggestions();
    } else {
      filterSuggestions(searchInput.toLowerCase());
    }
  }, [searchInput, currentTab]);

  const generateDefaultSuggestions = () => {
    if (currentTab === 'product-categories') {
      const defaultSuggestions = Object.keys(searchData['product-categories']).map(category => ({
        type: 'category',
        data: category,
        display: category,
        icon: searchData['product-categories'][category].icon,
        count: searchData['product-categories'][category].products.length
      }));
      setSuggestions(defaultSuggestions);
    } else {
      const topUsers = [...searchData['accounts'].users]
        .sort((a, b) => b.boostSales - a.boostSales)
        .slice(0, 5)
        .map(user => ({
          type: 'account',
          data: user,
          display: user.displayName,
          icon: searchData['accounts'].icon,
          username: user.username
        }));
      setSuggestions(topUsers);
    }
  };

  const filterSuggestions = (query) => {
    if (currentTab === 'product-categories') {
      const categories = Object.keys(searchData['product-categories'])
        .filter(category => category.toLowerCase().includes(query))
        .map(category => ({
          type: 'category',
          data: category,
          display: category,
          icon: searchData['product-categories'][category].icon,
          count: searchData['product-categories'][category].products.length
        }));

      if (categories.length === 0) {
        setSuggestions([{
          type: 'no-results',
          display: 'No categories found. Press Enter to search products.',
          icon: '🔍'
        }]);
      } else {
        setSuggestions(categories);
      }
    } else {
      const results = [];
      const users = searchData['accounts'].users;

      // Exact username match
      const exactMatch = users.find(u => u.username.toLowerCase() === query);
      if (exactMatch) {
        results.push({
          type: 'account-exact',
          data: exactMatch,
          display: exactMatch.displayName,
          icon: searchData['accounts'].icon,
          username: exactMatch.username
        });
      }

      // Username contains
      users.filter(u => u.username.toLowerCase().includes(query) && u !== exactMatch)
        .forEach(user => {
          results.push({
            type: 'account-contains',
            data: user,
            display: user.displayName,
            icon: searchData['accounts'].icon,
            username: user.username
          });
        });

      // Product category match
      users.filter(u => u.products.some(p => p.toLowerCase().includes(query)))
        .forEach(user => {
          if (!results.find(r => r.data.username === user.username)) {
            results.push({
              type: 'account-category',
              data: user,
              display: user.displayName,
              icon: searchData['accounts'].icon,
              username: user.username
            });
          }
        });

      // Display name match
      users.filter(u => u.displayName.toLowerCase().includes(query))
        .forEach(user => {
          if (!results.find(r => r.data.username === user.username)) {
            results.push({
              type: 'account-display',
              data: user,
              display: user.displayName,
              icon: searchData['accounts'].icon,
              username: user.username
            });
          }
        });

      // Sort by boost sales
      results.sort((a, b) => b.data.boostSales - a.data.boostSales);

      if (results.length === 0) {
        setSuggestions([{
          type: 'no-results',
          display: 'No accounts found',
          icon: '🔍'
        }]);
      } else {
        setSuggestions(results);
      }
    }
  };

  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
    setShowSuggestions(true);
    setShowResults(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSuggestionClick(suggestions[0]);
      } else if (searchInput.trim()) {
        performSearch();
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'category') {
      showCategoryProducts(suggestion.data);
    } else if (suggestion.type.startsWith('account')) {
      // Redirect to user profile
      window.location.href = `/accounts/user/${suggestion.data.username}/`;
      onClose();
    } else if (suggestion.type === 'no-results') {
      performSearch();
    }
  };

  const showCategoryProducts = (category) => {
    const products = [...searchData['product-categories'][category].products]
      .sort((a, b) => b.boostSales - a.boostSales);
    
    setResults(products);
    setShowResults(true);
    setShowSuggestions(false);
  };

  const performSearch = () => {
    if (currentTab === 'product-categories') {
      // Redirect to search page
      window.location.href = `/products/search/?q=${encodeURIComponent(searchInput)}`;
      onClose();
    } else {
      // Filter account results
      const filteredResults = searchData['accounts'].users
        .filter(user => 
          user.username.toLowerCase().includes(searchInput.toLowerCase()) ||
          user.displayName.toLowerCase().includes(searchInput.toLowerCase()) ||
          user.products.some(p => p.toLowerCase().includes(searchInput.toLowerCase()))
        )
        .sort((a, b) => b.boostSales - a.boostSales);
      
      setResults(filteredResults);
      setShowResults(true);
      setShowSuggestions(false);
    }
  };

  const switchTab = (tab) => {
    setCurrentTab(tab);
    setSearchInput('');
    setShowSuggestions(false);
    setShowResults(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="search-overlay" ref={searchRef}>
      <button className="close-search" onClick={onClose}>×</button>
      <div className="search-container">
        <div className="search-tabs">
          <button 
            className={`tab-btn ${currentTab === 'product-categories' ? 'active' : ''}`}
            onClick={() => switchTab('product-categories')}
          >
            🏷️ Product Categories
          </button>
          <button 
            className={`tab-btn ${currentTab === 'accounts' ? 'active' : ''}`}
            onClick={() => switchTab('accounts')}
          >
            👥 Accounts
          </button>
        </div>
        
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            className="search-input"
            placeholder={currentTab === 'product-categories' 
              ? "Search product categories..." 
              : "Search accounts by username or product category..."}
            value={searchInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            autoComplete="off"
          />
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="suggestion-icon">{suggestion.icon || '🔍'}</span>
                  <div style={{ flexGrow: 1 }}>
                    <div className="suggestion-text">{suggestion.display}</div>
                    {suggestion.username && (
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        @{suggestion.username}
                      </div>
                    )}
                    {suggestion.count && (
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {suggestion.count} products
                      </div>
                    )}
                  </div>
                  {suggestion.type === 'category' && (
                    <span className="suggestion-type">Category</span>
                  )}
                  {suggestion.type.startsWith('account') && (
                    <span className="suggestion-type">Account</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {showResults && results.length > 0 && (
          <div className="search-results">
            {currentTab === 'product-categories' ? (
              <>
                <div className="result-item" style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <div>🏷️ Products - Search Results</div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'normal' }}>
                    Sorted by popularity • {results.length} products
                  </div>
                </div>
                {results.map((product, index) => (
                  <div key={index} className="result-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{index + 1}.</span>
                      <div style={{ flexGrow: 1 }}>
                        <div className="result-title">{product.name}</div>
                        <div className="result-description">
                          Listed: {product.uploadDate} • Boost: {product.boostSales}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          window.location.href = product.url;
                          onClose();
                        }}
                        style={{
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          padding: '8px 15px',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="result-item" style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <div>👥 Accounts - Search Results</div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'normal' }}>
                    {results.length} accounts found
                  </div>
                </div>
                {results.map((user, index) => (
                  <div key={index} className="result-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '20px' }}>👤</div>
                      <div style={{ flexGrow: 1 }}>
                        <div className="result-title">{user.displayName}</div>
                        <div className="result-description">
                          @{user.username} • Sells: {user.products.join(', ')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                          Boost Sales: {user.boostSales} • Joined: {user.joinDate}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          window.location.href = `/accounts/user/${user.username}/`;
                          onClose();
                        }}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 15px',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;