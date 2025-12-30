import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/useProducts';
import ProductCard from '../../components/ProductCard/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import BoostProductModal from '../../components/BoostProductModal/BoostProductModal';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { products, loading, fetchProducts } = useProducts();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0 && id) {
      // Find the product by ID
      const foundProduct = products.find(p => p.id === id || p._id === id);
      if (foundProduct) {
        setProduct(foundProduct);
        
        // Find related products (same category)
        const related = products
          .filter(p => 
            p.id !== foundProduct.id && 
            p.category === foundProduct.category &&
            p.sellerEmail !== 'gichehalawrence@gmail.com'
          )
          .sort((a, b) => b.boostSales - a.boostSales)
          .slice(0, 4);
        
        setRelatedProducts(related);
        
        // Load reviews
        loadReviews(foundProduct.id);
      } else {
        // Product not found
        navigate('/404');
      }
    }
  }, [products, id, navigate]);

  const loadReviews = async (productId) => {
    // Mock reviews for now
    const mockReviews = [
      {
        id: 1,
        user: { name: 'John Doe', avatar: 'J' },
        rating: 5,
        comment: 'Excellent product! Fast delivery and great quality.',
        date: '2024-01-15',
        verified: true
      },
      {
        id: 2,
        user: { name: 'Sarah Smith', avatar: 'S' },
        rating: 4,
        comment: 'Good value for money. Would recommend.',
        date: '2024-01-10',
        verified: true
      },
      {
        id: 3,
        user: { name: 'Mike Johnson', avatar: 'M' },
        rating: 3,
        comment: 'Product was okay, but delivery took longer than expected.',
        date: '2024-01-05',
        verified: false
      }
    ];
    setReviews(mockReviews);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        ...product,
        quantity: quantity
      });
      // Show success message
      alert(`Added ${quantity} ${product.name}(s) to cart!`);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  const handleBoost = async (productId, duration, price) => {
    console.log(`Boosting product ${productId} for ${duration} at $${price}`);
    // Implement actual boost payment logic
    alert(`Product boosted successfully for ${duration}!`);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to submit a review');
      navigate('/login');
      return;
    }

    const review = {
      id: reviews.length + 1,
      user: {
        name: user.name || 'User',
        avatar: user.name ? user.name.charAt(0).toUpperCase() : 'U'
      },
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0],
      verified: user.email === product?.sellerEmail
    };

    setReviews([review, ...reviews]);
    setNewReview({ rating: 5, comment: '' });
    
    // Update product rating
    if (product) {
      const totalReviews = reviews.length + 1;
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0) + newReview.rating;
      const newRating = totalRating / totalReviews;
      
      setProduct({
        ...product,
        rating: parseFloat(newRating.toFixed(1))
      });
    }
  };

  if (loading || !product) {
    return <LoadingSpinner text="Loading product details..." />;
  }

  const isSuperAdminProduct = product.sellerEmail === 'gichehalawrence@gmail.com';
  const images = product.images || [
    product.image || 'https://via.placeholder.com/600x400?text=Product+Image'
  ];

  return (
    <div className="product-detail">
      {/* Product Images */}
      <div className="product-images">
        <div className="main-image">
          <img src={images[selectedImage]} alt={product.name} />
        </div>
        <div className="thumbnail-images">
          {images.map((img, index) => (
            <div
              key={index}
              className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
              onClick={() => setSelectedImage(index)}
            >
              <img src={img} alt={`${product.name} view ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Product Info */}
      <div className="product-info">
        <div className="product-header">
          <div className="product-title-section">
            <h1>{product.name}</h1>
            {isSuperAdminProduct && (
              <span className="super-admin-badge">🌟 Super Admin Product</span>
            )}
          </div>
          
          <div className="product-meta">
            <div className="product-seller">
              <span className="seller-icon">👤</span>
              <span className="seller-name">
                {product.seller || 'Unknown Seller'}
                {isSuperAdminProduct && ' (You)'}
              </span>
            </div>
            <div className="product-category">
              <span className="category-icon">🏷️</span>
              <span>{product.category}</span>
            </div>
          </div>
        </div>

        <div className="product-rating">
          <div className="stars">
            {'⭐'.repeat(Math.floor(product.rating || 0))}
            {'☆'.repeat(5 - Math.floor(product.rating || 0))}
            <span className="rating-value">{product.rating?.toFixed(1) || '0.0'}</span>
            <span className="review-count">({reviews.length} reviews)</span>
          </div>
          <div className="boost-info">
            <span className="boost-icon">🚀</span>
            <span className="boost-count">{product.boostSales || 0} Boost Sales</span>
            {user?.email === product.sellerEmail && !isSuperAdminProduct && (
              <button 
                className="boost-button"
                onClick={() => setShowBoostModal(true)}
              >
                Boost Product
              </button>
            )}
          </div>
        </div>

        <div className="product-description">
          <h3>Description</h3>
          <p>{product.description || 'No description available.'}</p>
        </div>

        <div className="product-specs">
          <h3>Specifications</h3>
          <div className="specs-grid">
            <div className="spec-item">
              <span className="spec-label">Category:</span>
              <span className="spec-value">{product.category}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Stock:</span>
              <span className="spec-value">
                {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
              </span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Uploaded:</span>
              <span className="spec-value">{product.uploadDate || 'N/A'}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Condition:</span>
              <span className="spec-value">{product.condition || 'New'}</span>
            </div>
          </div>
        </div>

        <div className="product-purchase">
          <div className="price-section">
            <div className="current-price">${product.price?.toFixed(2)}</div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="original-price">${product.originalPrice.toFixed(2)}</div>
            )}
            {product.discount && (
              <div className="discount-badge">-{product.discount}%</div>
            )}
          </div>

          <div className="quantity-section">
            <label htmlFor="quantity">Quantity:</label>
            <div className="quantity-controls">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(value, product.stock || 99)));
                }}
                min="1"
                max={product.stock || 99}
              />
              <button 
                onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                disabled={quantity >= (product.stock || 99)}
              >
                +
              </button>
            </div>
            <div className="stock-info">
              {product.stock > 10 ? 'In stock' : 
               product.stock > 0 ? `Only ${product.stock} left!` : 'Out of stock'}
            </div>
          </div>

          <div className="action-buttons">
            <button 
              className="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={!product.stock || product.stock <= 0}
            >
              🛒 Add to Cart
            </button>
            <button 
              className="buy-now-btn"
              onClick={handleBuyNow}
              disabled={!product.stock || product.stock <= 0}
            >
              💳 Buy Now
            </button>
            <button className="wishlist-btn">
              ❤️ Add to Wishlist
            </button>
          </div>

          <div className="shipping-info">
            <p>🚚 Free shipping on orders over $50</p>
            <p>🔄 30-day return policy</p>
            <p>🛡️ Buyer protection included</p>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2>⭐ Customer Reviews</h2>
        
        {/* Review Form */}
        <div className="review-form">
          <h3>Write a Review</h3>
          <form onSubmit={handleSubmitReview}>
            <div className="rating-input">
              <label>Rating:</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${newReview.rating >= star ? 'active' : ''}`}
                    onClick={() => setNewReview({...newReview, rating: star})}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            <div className="comment-input">
              <label htmlFor="comment">Your Review:</label>
              <textarea
                id="comment"
                value={newReview.comment}
                onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                placeholder="Share your experience with this product..."
                rows="4"
                required
              />
            </div>
            <button type="submit" className="submit-review-btn">
              Submit Review
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="reviews-list">
          {reviews.length > 0 ? (
            reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-avatar">{review.user.avatar}</div>
                    <div>
                      <div className="reviewer-name">{review.user.name}</div>
                      <div className="review-date">{review.date}</div>
                    </div>
                  </div>
                  <div className="review-rating">
                    {'⭐'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                    {review.verified && <span className="verified-badge">✅ Verified Purchase</span>}
                  </div>
                </div>
                <div className="review-comment">
                  {review.comment}
                </div>
              </div>
            ))
          ) : (
            <div className="no-reviews">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h2>🛍️ Related Products</h2>
          <div className="related-grid">
            {relatedProducts.map(relatedProduct => (
              <ProductCard 
                key={relatedProduct.id} 
                product={relatedProduct}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <BoostProductModal
          product={product}
          onClose={() => setShowBoostModal(false)}
          onBoost={handleBoost}
        />
      )}
    </div>
  );
};

export default ProductDetail;
