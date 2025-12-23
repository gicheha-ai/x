import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import BoostProductModal from '../../components/BoostProductModal/BoostProductModal';
import './BoostSales.css';

const BoostSales = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('plans');
  const [products, setProducts] = useState([]);
  const [boostedProducts, setBoostedProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [boostStats, setBoostStats] = useState({
    totalSpent: 0,
    activeBoosts: 0,
    revenueGenerated: 0,
    roi: 0
  });

  useEffect(() => {
    // Simulate loading boost data
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Mock products data
      setProducts([
        {
          id: 'PROD-001',
          name: 'Wireless Headphones',
          currentBoost: 500,
          sales: 120,
          revenue: 10798.80,
          ranking: 2,
          boostRequired: 600,
          category: 'Electronics'
        },
        {
          id: 'PROD-002',
          name: 'Smart Watch',
          currentBoost: 300,
          sales: 45,
          revenue: 8999.55,
          ranking: 5,
          boostRequired: 400,
          category: 'Electronics'
        },
        {
          id: 'PROD-003',
          name: 'Phone Case',
          currentBoost: 200,
          sales: 200,
          revenue: 3998.00,
          ranking: 8,
          boostRequired: 300,
          category: 'Accessories'
        },
        {
          id: 'PROD-004',
          name: 'Running Shoes',
          currentBoost: 0,
          sales: 25,
          revenue: 2497.50,
          ranking: 15,
          boostRequired: 100,
          category: 'Clothing'
        }
      ]);
      
      // Mock boosted products
      setBoostedProducts([
        {
          id: 'BOOST-001',
          productId: 'PROD-001',
          productName: 'Wireless Headphones',
          boostLevel: 500,
          boostType: 'weekly',
          price: 50,
          started: '2024-01-10',
          expires: '2024-01-17',
          performance: '+240%'
        },
        {
          id: 'BOOST-002',
          productId: 'PROD-003',
          productName: 'Phone Case',
          boostLevel: 200,
          boostType: 'daily',
          price: 10,
          started: '2024-01-15',
          expires: '2024-01-16',
          performance: '+120%'
        }
      ]);
      
      // Mock boost stats
      setBoostStats({
        totalSpent: 150,
        activeBoosts: 2,
        revenueGenerated: 4500,
        roi: 2900
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleBoostClick = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleBoostComplete = (boostData) => {
    // Simulate boost completion
    alert(`Boost purchased successfully! ${product.name} will be boosted for ${boostData.duration}.`);
    setShowModal(false);
    // Refresh data
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const boostPlans = [
    {
      name: 'Daily Boost',
      price: 10,
      duration: '24 hours',
      features: [
        'Top of category listing',
        'Featured in search results',
        'Priority placement',
        '24-hour duration'
      ],
      bestFor: 'Quick sales boost'
    },
    {
      name: 'Weekly Boost',
      price: 50,
      duration: '7 days',
      features: [
        'All Daily features',
        'Trending section placement',
        'Homepage visibility',
        'Email promotion',
        '7-day duration'
      ],
      bestFor: 'Best value',
      popular: true
    },
    {
      name: 'Monthly Boost',
      price: 150,
      duration: '30 days',
      features: [
        'All Weekly features',
        'Featured seller badge',
        'Premium support',
        'Advanced analytics',
        '30-day duration'
      ],
      bestFor: 'Maximum exposure'
    }
  ];

  if (loading) {
    return <LoadingSpinner text="Loading boost sales..." />;
  }

  return (
    <div className="boost-container">
      <div className="boost-header">
        <div className="boost-greeting">
          <h1>🚀 Boost Sales</h1>
          <p>Increase your product visibility and sales</p>
        </div>
        
        <div className="boost-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Boost Spent</h3>
              <p className="stat-value">${boostStats.totalSpent}</p>
              <p className="stat-detail">Lifetime investment</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h3>Revenue Generated</h3>
              <p className="stat-value">${boostStats.revenueGenerated}</p>
              <p className="stat-detail">From boosted products</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>ROI</h3>
              <p className="stat-value">{boostStats.roi}%</p>
              <p className="stat-detail">Return on investment</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <h3>Active Boosts</h3>
              <p className="stat-value">{boostStats.activeBoosts}</p>
              <p className="stat-detail">Currently running</p>
            </div>
          </div>
        </div>
      </div>

      <div className="boost-tabs">
        <button 
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          💎 Boost Plans
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏪 My Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          🚀 Active Boosts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Boost Analytics
        </button>
      </div>

      <div className="boost-content">
        {activeTab === 'plans' && (
          <div className="plans-tab">
            <div className="plans-intro">
              <h2>Choose Your Boost Plan</h2>
              <p>Boost your products to increase visibility and sales. Higher boost levels mean better rankings.</p>
            </div>

            <div className="plans-comparison">
              <table className="plans-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {boostPlans.map(plan => (
                      <th key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.name}
                        {plan.popular && <span className="popular-badge">Most Popular</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Price</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        <span className="price">${plan.price}</span>
                        <span className="duration">/{plan.duration.split(' ')[0]}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Category Ranking</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.features.includes('Top of category listing') ? '✅ Top 3' : '❌ Not included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Search Results</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.features.includes('Featured in search results') ? '✅ First page' : '❌ Standard'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Homepage Visibility</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.features.includes('Homepage visibility') ? '✅ Featured' : '❌ Not included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Trending Section</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.features.includes('Trending section placement') ? '✅ Included' : '❌ Not included'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Support</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        {plan.features.includes('Premium support') ? '✅ Priority' : '✅ Standard'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Best For</td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        <span className="best-for">{plan.bestFor}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td></td>
                    {boostPlans.map(plan => (
                      <td key={plan.name} className={plan.popular ? 'popular' : ''}>
                        <button 
                          className={`select-plan-btn ${plan.popular ? 'popular' : ''}`}
                          onClick={() => {
                            setSelectedProduct(null);
                            setShowModal(true);
                          }}
                        >
                          Select Plan
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="boost-benefits">
              <h3>Why Boost Your Products?</h3>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">👁️</div>
                  <h4>Increased Visibility</h4>
                  <p>Get 5-10x more views on boosted products</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">💰</div>
                  <h4>Higher Sales</h4>
                  <p>Average 300% sales increase with boosting</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">📈</div>
                  <h4>Better Ranking</h4>
                  <p>Appear at the top of search and category listings</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">🎯</div>
                  <h4>Targeted Exposure</h4>
                  <p>Reach customers actively searching for your products</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="products-header">
              <h2>Your Products</h2>
              <p>Select products to boost for increased visibility</p>
            </div>

            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Current Boost</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>Ranking</th>
                    <th>Boost Required</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-info">
                          <strong>{product.name}</strong>
                          <small>ID: {product.id}</small>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>
                        <span className={`boost-level ${product.currentBoost > 0 ? 'boosted' : ''}`}>
                          {product.currentBoost > 0 ? `🚀 ${product.currentBoost}` : 'No Boost'}
                        </span>
                      </td>
                      <td>{product.sales}</td>
                      <td>${product.revenue.toFixed(2)}</td>
                      <td>#{product.ranking}</td>
                      <td>
                        <span className="boost-required">
                          {product.boostRequired} to rank higher
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleBoostClick(product)}
                          className="boost-now-btn"
                        >
                          Boost Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ranking-info">
              <h3>📊 How Ranking Works</h3>
              <div className="ranking-details">
                <p><strong>Ranking Formula:</strong> (Boost Sales × 2) + (Sales Velocity × 1.5) + (Product Age × 0.5)</p>
                <p><strong>Note:</strong> Products from super admin account (gichehalawrence@gmail.com) always rank first without boost.</p>
                <div className="ranking-tips">
                  <h4>Tips to Improve Ranking:</h4>
                  <ul>
                    <li>Maintain consistent boost levels</li>
                    <li>Increase product reviews and ratings</li>
                    <li>Keep products in stock</li>
                    <li>Update product information regularly</li>
                    <li>Use high-quality images</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'active' && (
          <div className="active-tab">
            <div className="active-header">
              <h2>Active Boosts</h2>
              <p>Currently running boosts on your products</p>
            </div>

            {boostedProducts.length > 0 ? (
              <>
                <div className="boosted-products-grid">
                  {boostedProducts.map(boost => (
                    <div key={boost.id} className="boosted-product-card">
                      <div className="boost-header">
                        <div className="boost-icon">🚀</div>
                        <div className="boost-info">
                          <h3>{boost.productName}</h3>
                          <div className="boost-details">
                            <span className="boost-type">{boost.boostType.toUpperCase()} Boost</span>
                            <span className="boost-level">Level: {boost.boostLevel}</span>
                            <span className="boost-price">Cost: ${boost.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="boost-timeline">
                        <div className="timeline-item">
                          <span className="timeline-label">Started:</span>
                          <span className="timeline-value">{boost.started}</span>
                        </div>
                        <div className="timeline-item">
                          <span className="timeline-label">Expires:</span>
                          <span className="timeline-value">{boost.expires}</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: '60%' }}
                          ></div>
                          <span className="progress-text">60% complete</span>
                        </div>
                      </div>
                      
                      <div className="boost-performance">
                        <div className="performance-item">
                          <span className="performance-label">Performance:</span>
                          <span className="performance-value positive">{boost.performance}</span>
                        </div>
                        <div className="performance-item">
                          <span className="performance-label">Estimated Sales:</span>
                          <span className="performance-value">+45 sales</span>
                        </div>
                      </div>
                      
                      <div className="boost-actions">
                        <button className="extend-btn">Extend Boost</button>
                        <button className="upgrade-btn">Upgrade Plan</button>
                        <button className="cancel-btn">Cancel</button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="boost-performance-summary">
                  <h3>Boost Performance Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <h4>Total Investment</h4>
                      <p className="summary-value">${boostStats.totalSpent}</p>
                      <p className="summary-label">Lifetime boost spending</p>
                    </div>
                    <div className="summary-card">
                      <h4>Revenue Generated</h4>
                      <p className="summary-value">${boostStats.revenueGenerated}</p>
                      <p className="summary-label">From boosted products</p>
                    </div>
                    <div className="summary-card">
                      <h4>Average ROI</h4>
                      <p className="summary-value">{boostStats.roi}%</p>
                      <p className="summary-label">Return on investment</p>
                    </div>
                    <div className="summary-card">
                      <h4>Best Performing</h4>
                      <p className="summary-value">Weekly Boost</p>
                      <p className="summary-label">Highest conversion rate</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-boosts">
                <div className="no-boosts-icon">🚀</div>
                <h3>No Active Boosts</h3>
                <p>You don't have any active boosts. Start boosting your products to increase sales!</p>
                <button 
                  className="start-boosting-btn"
                  onClick={() => setActiveTab('plans')}
                >
                  Start Boosting Now
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h2>Boost Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card large">
                <h3>Boost Performance Over Time</h3>
                <div className="chart-placeholder">
                  <p>📈 Performance chart will appear here</p>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>Top Boosted Products</h3>
                <div className="top-products-list">
                  {products
                    .filter(p => p.currentBoost > 0)
                    .sort((a, b) => b.sales - a.sales)
                    .slice(0, 3)
                    .map((product, index) => (
                      <div key={product.id} className="top-product-item">
                        <span className="rank">{index + 1}.</span>
                        <span className="name">{product.name}</span>
                        <span className="sales">{product.sales} sales</span>
                      </div>
                    ))}
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>Boost ROI by Plan</h3>
                <div className="roi-list">
                  <div className="roi-item">
                    <span className="plan-name">Daily Boost</span>
                    <span className="roi-value">180% ROI</span>
                  </div>
                  <div className="roi-item">
                    <span className="plan-name">Weekly Boost</span>
                    <span className="roi-value">320% ROI</span>
                  </div>
                  <div className="roi-item">
                    <span className="plan-name">Monthly Boost</span>
                    <span className="roi-value">290% ROI</span>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>Boost Recommendations</h3>
                <div className="recommendations">
                  <div className="recommendation">
                    <strong>Best Time to Boost:</strong>
                    <p>Thursday - Sunday for maximum sales</p>
                  </div>
                  <div className="recommendation">
                    <strong>Optimal Boost Level:</strong>
                    <p>Weekly boost provides best value</p>
                  </div>
                  <div className="recommendation">
                    <strong>Suggested Products:</strong>
                    <p>Focus on high-margin products</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="analytics-summary">
              <h3>Key Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <h4>Peak Performance</h4>
                  <p>Boosted products sell 3.2x faster than non-boosted</p>
                </div>
                <div className="insight-card">
                  <h4>Customer Reach</h4>
                  <p>Boost increases product visibility by 540%</p>
                </div>
                <div className="insight-card">
                  <h4>Conversion Rate</h4>
                  <p>22% higher conversion rate on boosted products</p>
                </div>
                <div className="insight-card">
                  <h4>Best Duration</h4>
                  <p>7-day boosts provide optimal balance of cost and results</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BoostProductModal
          product={selectedProduct}
          onClose={() => setShowModal(false)}
          onBoostComplete={handleBoostComplete}
        />
      )}
    </div>
  );
};

export default BoostSales;