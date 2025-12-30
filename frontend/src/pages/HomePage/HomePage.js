import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useProducts } from '../../hooks/useProducts';
import ProductCard from '../../components/ProductCard/ProductCard';
import CategoryCard from '../../components/CategoryCard/CategoryCard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './HomePage.css';

const HomePage = () => {
  const { user } = useAuth();
  const { products, categories, loading, fetchProducts } = useProducts();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      // Super admin products always first
      const superAdminProducts = products.filter(p => 
        p.sellerEmail === 'gichehalawrence@gmail.com'
      );
      
      // Boosted products (sorted by boost sales)
      const boostedProducts = products
        .filter(p => p.boostSales > 0 && p.sellerEmail !== 'gichehalawrence@gmail.com')
        .sort((a, b) => b.boostSales - a.boostSales)
        .slice(0, 6);

      // Regular products
      const regularProducts = products
        .filter(p => p.boostSales === 0 && p.sellerEmail !== 'gichehalawrence@gmail.com')
        .slice(0, 6);

      // Combine with super admin products first
      setFeaturedProducts([
        ...superAdminProducts,
        ...boostedProducts.slice(0, 3)
      ]);

      setTrendingProducts([
        ...boostedProducts.slice(0, 6),
        ...regularProducts.slice(0, 3)
      ]);
    }
  }, [products]);

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to E-Commerce Platform</h1>
          <p>Discover amazing products with multiple payment options including Airtel Money</p>
          {!user && (
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => window.location.href = '/register'}>
                Get Started
              </button>
              <button className="secondary-btn" onClick={() => window.location.href = '/products'}>
                Browse Products
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <h2>🌟 Featured Products</h2>
        <p className="section-subtitle">Top products with boost sales</p>
        <div className="products-grid">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.id || index} product={product} />
          ))}
        </div>
        {featuredProducts.length === 0 && (
          <p className="no-products">No featured products yet.</p>
        )}
      </section>

      {/* Categories */}
      <section className="categories-section">
        <h2>🏷️ Shop by Category</h2>
        <p className="section-subtitle">Browse products by category</p>
        <div className="categories-grid">
          {Object.entries(categories).map(([category, data], index) => (
            <CategoryCard 
              key={index} 
              category={category} 
              data={data}
              onClick={(cat, products) => {
                window.location.href = `/products?category=${encodeURIComponent(cat)}`;
              }}
            />
          ))}
        </div>
        {Object.keys(categories).length === 0 && (
          <p className="no-categories">No categories available.</p>
        )}
      </section>

      {/* Trending Products */}
      <section className="trending-section">
        <h2>🔥 Trending Now</h2>
        <p className="section-subtitle">Most popular products this week</p>
        <div className="products-grid">
          {trendingProducts.map((product, index) => (
            <ProductCard key={product.id || index} product={product} />
          ))}
        </div>
        {trendingProducts.length === 0 && (
          <p className="no-products">No trending products yet.</p>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="benefits-section">
        <h2>✅ Why Choose Our Platform</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">🚀</div>
            <h3>Boost Sales</h3>
            <p>Increase product visibility with our boost system</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🤝</div>
            <h3>Affiliate Program</h3>
            <p>Earn commissions by promoting products</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📱</div>
            <h3>Airtel Money</h3>
            <p>Secure payments via Airtel Money</p>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🛡️</div>
            <h3>Secure Payments</h3>
            <p>Multiple secure payment options</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Ready to Start Selling?</h2>
        <p>Join thousands of sellers on our platform</p>
        <div className="cta-actions">
          <button className="cta-btn" onClick={() => window.location.href = '/register'}>
            Become a Seller
          </button>
          <button className="cta-btn secondary" onClick={() => window.location.href = '/affiliate'}>
            Join Affiliate Program
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
