import React from 'react';
import './ProductCard.css';

const ProductCard = ({ product, showBoost = true, showDate = true, compact = false }) => {
  const {
    name,
    url,
    boostSales,
    uploadDate,
    price,
    description,
    category,
    rating,
    image,
    seller
  } = product;

  const handleViewClick = () => {
    window.location.href = url || `/products/${product.id}`;
  };

  const handleAddToCart = () => {
    // Add to cart functionality will be implemented in context
    console.log('Added to cart:', name);
  };

  return (
    <div className={`product-card ${compact ? 'compact' : ''}`}>
      {image && (
        <div className="product-image">
          <img src={image} alt={name} />
        </div>
      )}
      
      <div className="product-content">
        <div className="product-header">
          <h3 className="product-title">{name}</h3>
          {category && (
            <span className="product-category">{category}</span>
          )}
        </div>
        
        {description && !compact && (
          <p className="product-description">{description}</p>
        )}
        
        <div className="product-details">
          {showBoost && (
            <div className="product-boost">
              <span className="boost-icon">🚀</span>
              <span className="boost-text">{boostSales || 0} Boost Sales</span>
            </div>
          )}
          
          {showDate && uploadDate && (
            <div className="product-date">
              <span className="date-icon">📅</span>
              <span>Listed: {uploadDate}</span>
            </div>
          )}
          
          {price && (
            <div className="product-price">
              <span className="price-icon">💰</span>
              <span className="price-text">${price.toFixed(2)}</span>
            </div>
          )}
          
          {rating && (
            <div className="product-rating">
              <span className="star-icon">⭐</span>
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        {seller && !compact && (
          <div className="product-seller">
            <span className="seller-icon">👤</span>
            <span className="seller-name">{seller}</span>
          </div>
        )}
        
        <div className="product-actions">
          <button 
            onClick={handleViewClick}
            className="view-button"
          >
            View Details
          </button>
          <button 
            onClick={handleAddToCart}
            className="cart-button"
          >
            🛒 Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
