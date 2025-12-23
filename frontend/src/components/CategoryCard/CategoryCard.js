import React from 'react';
import './CategoryCard.css';

const CategoryCard = ({ category, data, onClick }) => {
  const { products = [], icon = '📦' } = data || {};
  
  const sortedProducts = [...products].sort((a, b) => {
    if (b.boostSales !== a.boostSales) {
      return b.boostSales - a.boostSales;
    }
    return new Date(a.uploadDate) - new Date(b.uploadDate);
  });

  const topProduct = sortedProducts[0];

  const handleClick = () => {
    if (onClick) {
      onClick(category, sortedProducts);
    }
  };

  const totalBoost = products.reduce((sum, p) => sum + (p.boostSales || 0), 0);

  return (
    <div className="category-card" onClick={handleClick}>
      <div className="category-header">
        <div className="category-icon">{icon}</div>
        <h3 className="category-title">{category}</h3>
      </div>
      
      <div className="category-stats">
        <div className="stat-item">
          <div className="stat-number">{products.length}</div>
          <div className="stat-label">Products</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-number">{totalBoost}</div>
          <div className="stat-label">Total Boost</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">🔥</div>
          <div className="stat-label">Hot</div>
        </div>
      </div>
      
      {topProduct && (
        <div className="top-product">
          <div className="top-product-label">Top Product:</div>
          <div className="top-product-name">{topProduct.name}</div>
          <div className="top-product-boost">
            <span className="boost-icon">🚀</span>
            <span>{topProduct.boostSales || 0} Boost</span>
          </div>
        </div>
      )}
      
      <div className="category-footer">
        <button className="view-button">
          Browse {category}
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;