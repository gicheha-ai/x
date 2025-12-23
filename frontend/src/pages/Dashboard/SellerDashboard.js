import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Dashboard.css';

const SellerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [storeStats, setStoreStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    activeProducts: 0,
    boostSpent: 0
  });

  useEffect(() => {
    // Simulate loading seller data
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Mock products data
      setProducts([
        {
          id: 'PROD-001',
          name: 'Wireless Headphones',
          price: 89.99,
          stock: 50,
          sales: 120,
          boost: true,
          boostLevel: 500,
          status: 'Active'
        },
        {
          id: 'PROD-002',
          name: 'Smart Watch',
          price: 199.99,
          stock: 25,
          sales: 45,
          boost: false,
          status: 'Active'
        },
        {
          id: 'PROD-003',
          name: 'Phone Case',
          price: 19.99,
          stock: 100,
          sales: 200,
          boost: true,
          boostLevel: 300,
          status: 'Active'
        }
      ]);
      
      // Mock sales data
      setSales([
        {
          id: 'SALE-001',
          date: '2024-01-15',
          product: 'Wireless Headphones',
          quantity: 2,
          revenue: 179.98,
          commission: 14.40,
          net: 165.58
        },
        {
          id: 'SALE-002',
          date: '2024-01-14',
          product: 'Smart Watch',
          quantity: 1,
          revenue: 199.99,
          commission: 16.00,
          net: 183.99
        }
      ]);
      
      // Mock store stats
      setStoreStats({
        totalSales: 365,
        totalRevenue: 4520.50,
        activeProducts: 3,
        boostSpent: 150
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading seller dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-greeting">
          <h1>Seller Dashboard</h1>
          <p>Manage your store and track sales</p>
        </div>
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Revenue</h3>
              <p className="stat-value">${storeStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Total Sales</h3>
              <p className="stat-value">{storeStats.totalSales}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏪</div>
            <div className="stat-content">
              <h3>Products</h3>
              <p className="stat-value">{storeStats.activeProducts}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <h3>Boost Spent</h3>
              <p className="stat-value">${storeStats.boostSpent}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏪 Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          💰 Sales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'boost' ? 'active' : ''}`}
          onClick={() => setActiveTab('boost')}
        >
          🚀 Boost Sales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <button className="action-card">
                  <span className="action-icon">➕</span>
                  <span className="action-text">Add New Product</span>
                </button>
                <button className="action-card">
                  <span className="action-icon">🚀</span>
                  <span className="action-text">Boost a Product</span>
                </button>
                <button className="action-card">
                  <span className="action-icon">📊</span>
                  <span className="action-text">View Analytics</span>
                </button>
                <button className="action-card">
                  <span className="action-icon">💰</span>
                  <span className="action-text">Withdraw Funds</span>
                </button>
              </div>
            </div>

            <div className="recent-sales">
              <h2>Recent Sales</h2>
              {sales.length > 0 ? (
                <div className="sales-list">
                  {sales.map(sale => (
                    <div key={sale.id} className="sale-card">
                      <div className="sale-header">
                        <span className="sale-id">{sale.id}</span>
                        <span className="sale-date">{sale.date}</span>
                      </div>
                      <div className="sale-details">
                        <p><strong>Product:</strong> {sale.product}</p>
                        <p><strong>Quantity:</strong> {sale.quantity}</p>
                        <p><strong>Revenue:</strong> ${sale.revenue.toFixed(2)}</p>
                        <p><strong>Commission:</strong> ${sale.commission.toFixed(2)}</p>
                        <p><strong>Net Earnings:</strong> ${sale.net.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No sales yet. Boost your products to increase visibility!</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <div className="products-header">
              <h2>Your Products</h2>
              <button className="add-product-btn">➕ Add Product</button>
            </div>
            
            {products.length > 0 ? (
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Sales</th>
                    <th>Boost</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                      <td>${product.price.toFixed(2)}</td>
                      <td>{product.stock}</td>
                      <td>{product.sales}</td>
                      <td>
                        {product.boost ? (
                          <span className="boost-badge">
                            🚀 {product.boostLevel} Boost
                          </span>
                        ) : (
                          <span className="no-boost">No Boost</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${product.status.toLowerCase()}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className="product-actions">
                          <button className="action-btn edit">Edit</button>
                          <button className="action-btn boost">Boost</button>
                          <button className="action-btn delete">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-products">
                <p>You haven't added any products yet.</p>
                <button className="add-first-product-btn">Add Your First Product</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="sales-tab">
            <h2>Sales History</h2>
            {sales.length > 0 ? (
              <div className="detailed-sales">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Sale ID</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Revenue</th>
                      <th>Commission</th>
                      <th>Net Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td>{sale.id}</td>
                        <td>{sale.date}</td>
                        <td>{sale.product}</td>
                        <td>{sale.quantity}</td>
                        <td>${sale.revenue.toFixed(2)}</td>
                        <td>${sale.commission.toFixed(2)}</td>
                        <td>
                          <strong>${sale.net.toFixed(2)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="sales-summary">
                  <h3>Sales Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Total Revenue:</span>
                      <span>${sales.reduce((sum, sale) => sum + sale.revenue, 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Commission:</span>
                      <span>${sales.reduce((sum, sale) => sum + sale.commission, 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Net Earnings:</span>
                      <span className="net-earnings">
                        ${sales.reduce((sum, sale) => sum + sale.net, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-sales">
                <p>No sales recorded yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'boost' && (
          <div className="boost-tab">
            <h2>Boost Sales Management</h2>
            <div className="boost-info">
              <p>Boost your products to increase visibility and sales!</p>
              <div className="boost-pricing">
                <h3>Boost Pricing:</h3>
                <div className="pricing-cards">
                  <div className="pricing-card">
                    <h4>Daily Boost</h4>
                    <p className="price">$10/day</p>
                    <ul>
                      <li>Top of category listing</li>
                      <li>Featured in search results</li>
                      <li>24-hour duration</li>
                    </ul>
                    <button className="select-plan-btn">Select</button>
                  </div>
                  <div className="pricing-card popular">
                    <h4>Weekly Boost</h4>
                    <p className="price">$50/week</p>
                    <p className="savings">Save $20</p>
                    <ul>
                      <li>All Daily features</li>
                      <li>Trending section placement</li>
                      <li>7-day duration</li>
                      <li>Priority customer support</li>
                    </ul>
                    <button className="select-plan-btn">Select</button>
                  </div>
                  <div className="pricing-card">
                    <h4>Monthly Boost</h4>
                    <p className="price">$150/month</p>
                    <p className="savings">Save $150</p>
                    <ul>
                      <li>All Weekly features</li>
                      <li>Homepage spotlight</li>
                      <li>30-day duration</li>
                      <li>Advanced analytics</li>
                    </ul>
                    <button className="select-plan-btn">Select</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="boosted-products">
              <h3>Currently Boosted Products</h3>
              {products.filter(p => p.boost).length > 0 ? (
                <div className="boosted-list">
                  {products.filter(p => p.boost).map(product => (
                    <div key={product.id} className="boosted-product">
                      <div className="product-details">
                        <h4>{product.name}</h4>
                        <p>Boost Level: {product.boostLevel}</p>
                        <p>Expires in: 3 days</p>
                      </div>
                      <div className="boost-actions">
                        <button className="extend-btn">Extend Boost</button>
                        <button className="upgrade-btn">Upgrade</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-boosted">No products are currently boosted.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h2>Store Analytics</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Sales Overview</h3>
                <div className="chart-placeholder">
                  <p>📈 Sales chart will appear here</p>
                </div>
              </div>
              <div className="analytics-card">
                <h3>Revenue Breakdown</h3>
                <div className="chart-placeholder">
                  <p>📊 Revenue chart will appear here</p>
                </div>
              </div>
              <div className="analytics-card">
                <h3>Top Products</h3>
                <div className="top-products-list">
                  {products.slice(0, 3).map((product, index) => (
                    <div key={product.id} className="top-product-item">
                      <span className="rank">{index + 1}.</span>
                      <span className="name">{product.name}</span>
                      <span className="sales">{product.sales} sales</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="analytics-card">
                <h3>Boost Performance</h3>
                <div className="boost-performance">
                  <p>Boosted products generate 3x more sales</p>
                  <p>Average ROI: 250%</p>
                  <p>Best performing boost: Weekly</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;