import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import ProductCard from '../../components/ProductCard/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './ProductList.css';

const ProductList = () => {
  const [searchParams] = useSearchParams();
  const { products, categories, loading, fetchProducts } = useProducts();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('boost');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      );
    }

    // Filter by price range
    filtered = filtered.filter(product =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Sort products
    filtered.sort((a, b) => {
      if (sortBy === 'boost') {
        // Super admin products always first
        if (a.sellerEmail === 'gichehalawrence@gmail.com' && b.sellerEmail !== 'gichehalawrence@gmail.com') return -1;
        if (b.sellerEmail === 'gichehalawrence@gmail.com' && a.sellerEmail !== 'gichehalawrence@gmail.com') return 1;
        
        // Then by boost sales
        return b.boostSales - a.boostSales;
      } else if (sortBy === 'price-low') {
        return a.price - b.price;
      } else if (sortBy === 'price-high') {
        return b.price - a.price;
      } else if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });

    setFilteredProducts(filtered);
  }, [products, selectedCategory, sortBy, priceRange, searchTerm]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const handlePriceChange = (e) => {
    const value = parseInt(e.target.value);
    setPriceRange([0, value]);
  };

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <div className="product-list-page">
      <div className="page-header">
        <h1>🛍️ Products</h1>
        <p>Browse our collection of amazing products</p>
      </div>

      <div className="product-list-container">
        {/* Sidebar Filters */}
        <div className="filters-sidebar">
          <div className="filter-section">
            <h3>🔍 Search</h3>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <h3>🏷️ Categories</h3>
            <div className="category-filters">
              <button
                className={`category-filter ${selectedCategory === '' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('')}
              >
                All Categories
              </button>
              {Object.keys(categories).map(category => (
                <button
                  key={category}
                  className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                  <span className="category-count">
                    {categories[category]?.products?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>💰 Price Range</h3>
            <div className="price-filter">
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange[1]}
                onChange={handlePriceChange}
                className="price-slider"
              />
              <div className="price-labels">
                <span>$0</span>
                <span>${priceRange[1]}</span>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h3>🚀 Boost Status</h3>
            <div className="boost-filter">
              <button className="boost-option">
                Boosted Products
              </button>
              <button className="boost-option">
                Super Admin Products
              </button>
              <button className="boost-option">
                Regular Products
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3>⭐ Rating</h3>
            <div className="rating-filter">
              {[4, 3, 2, 1].map(rating => (
                <button key={rating} className="rating-option">
                  {'⭐'.repeat(rating)}{'☆'.repeat(5 - rating)} & above
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="products-main">
          {/* Sort Options */}
          <div className="sort-options">
            <div className="sort-by">
              <span>Sort by:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="boost">Boost Sales (High to Low)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
            <div className="results-info">
              Showing {filteredProducts.length} of {products.length} products
              {selectedCategory && ` in "${selectedCategory}"`}
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="products-grid">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id || index} product={product} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search term</p>
              <button 
                className="reset-filters"
                onClick={() => {
                  setSelectedCategory('');
                  setSearchTerm('');
                  setPriceRange([0, 10000]);
                  setSortBy('boost');
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="pagination">
              <button className="page-btn">← Previous</button>
              <div className="page-numbers">
                <button className="page-number active">1</button>
                <button className="page-number">2</button>
                <button className="page-number">3</button>
                <span>...</span>
                <button className="page-number">10</button>
              </div>
              <button className="page-btn">Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;