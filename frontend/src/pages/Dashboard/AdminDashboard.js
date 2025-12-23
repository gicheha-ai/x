import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import RevenueDashboard from '../../components/RevenueDashboard/RevenueDashboard';
import LinkGenerator from '../../components/LinkGenerator/LinkGenerator';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    platformRevenue: 0,
    boostRevenue: 0,
    subscriptionRevenue: 0,
    affiliateRevenue: 0
  });

  useEffect(() => {
    // Check if user is super admin
    if (!user || user.email !== 'gichehalawrence@gmail.com') {
      return;
    }

    // Simulate loading admin data
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Mock admin stats
      setAdminStats({
        totalUsers: 1250,
        totalSellers: 89,
        totalProducts: 456,
        totalOrders: 892,
        platformRevenue: 12540.50,
        boostRevenue: 5240.00,
        subscriptionRevenue: 2500.00,
        affiliateRevenue: 3120.00
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [user]);

  if (!user || user.email !== 'gichehalawrence@gmail.com') {
    return (
      <div className="access-denied">
        <h2>🔒 Super Admin Access Only</h2>
        <p>This dashboard is restricted to platform administration.</p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading super admin dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-greeting">
          <h1>Super Admin Dashboard</h1>
          <p className="admin-badge">👑 Platform Owner</p>
          <p>Welcome back, {user.name || 'Super Admin'}!</p>
          <p className="admin-email">Email: {user.email}</p>
        </div>
        <div className="user-stats">
          <div className="stat-card admin-stat">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <p className="stat-value">{adminStats.totalUsers}</p>
              <p className="stat-change">+12 this week</p>
            </div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon">🏪</div>
            <div className="stat-content">
              <h3>Active Sellers</h3>
              <p className="stat-value">{adminStats.totalSellers}</p>
              <p className="stat-change">+3 this week</p>
            </div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Total Products</h3>
              <p className="stat-value">{adminStats.totalProducts}</p>
              <p className="stat-change">+24 this week</p>
            </div>
          </div>
          <div className="stat-card admin-stat">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Platform Revenue</h3>
              <p className="stat-value">${adminStats.platformRevenue.toFixed(2)}</p>
              <p className="stat-change">+$480 today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          💰 Revenue Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          🔗 Link Generator
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Product Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Platform Settings
        </button>
      </div>

      <div className="dashboard-content admin-content">
        {activeTab === 'revenue' && (
          <div className="revenue-tab">
            <RevenueDashboard />
          </div>
        )}

        {activeTab === 'links' && (
          <div className="links-tab">
            <LinkGenerator />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <h2>User Management</h2>
            <div className="users-controls">
              <div className="search-box">
                <input type="text" placeholder="Search users by name, email, or ID..." />
                <button className="search-btn">🔍 Search</button>
              </div>
              <div className="filter-options">
                <select>
                  <option value="all">All Users</option>
                  <option value="buyers">Buyers Only</option>
                  <option value="sellers">Sellers Only</option>
                  <option value="affiliates">Affiliates Only</option>
                  <option value="active">Active Users</option>
                  <option value="inactive">Inactive Users</option>
                </select>
                <button className="export-btn">📊 Export Data</button>
              </div>
            </div>

            <div className="users-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>USR-001</td>
                    <td>John Doe</td>
                    <td>john@example.com</td>
                    <td><span className="user-type buyer">Buyer</span></td>
                    <td>2024-01-15</td>
                    <td><span className="status-badge active">Active</span></td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn edit">Edit</button>
                    </td>
                  </tr>
                  <tr>
                    <td>USR-002</td>
                    <td>Sarah Smith</td>
                    <td>sarah@example.com</td>
                    <td><span className="user-type seller">Seller</span></td>
                    <td>2024-01-10</td>
                    <td><span className="status-badge active">Active</span></td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn edit">Edit</button>
                    </td>
                  </tr>
                  <tr>
                    <td>USR-003</td>
                    <td>Mike Johnson</td>
                    <td>mike@example.com</td>
                    <td><span className="user-type affiliate">Affiliate</span></td>
                    <td>2024-01-05</td>
                    <td><span className="status-badge suspended">Suspended</span></td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn suspend">Activate</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="admin-actions">
              <button className="action-btn bulk-action">Bulk Actions</button>
              <button className="action-btn add-user">➕ Add User</button>
              <button className="action-btn refresh">🔄 Refresh</button>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <h2>Product Management</h2>
            <div className="products-summary">
              <div className="summary-card">
                <h3>Product Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span>Total Products:</span>
                    <span className="stat-number">{adminStats.totalProducts}</span>
                  </div>
                  <div className="stat-item">
                    <span>Boosted Products:</span>
                    <span className="stat-number">42</span>
                  </div>
                  <div className="stat-item">
                    <span>Out of Stock:</span>
                    <span className="stat-number">8</span>
                  </div>
                  <div className="stat-item">
                    <span>Pending Review:</span>
                    <span className="stat-number">15</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="products-controls">
              <div className="search-box">
                <input type="text" placeholder="Search products..." />
                <button className="search-btn">🔍 Search</button>
              </div>
              <div className="filter-options">
                <select>
                  <option value="all">All Products</option>
                  <option value="boosted">Boosted Products</option>
                  <option value="trending">Trending Products</option>
                  <option value="super-admin">Super Admin Products</option>
                  <option value="needs-review">Needs Review</option>
                </select>
              </div>
            </div>

            <div className="products-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>Name</th>
                    <th>Seller</th>
                    <th>Price</th>
                    <th>Boost</th>
                    <th>Ranking</th>
                    <th>Status</th>
                    <th>Special</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="super-admin-product">
                    <td>PROD-SA-001</td>
                    <td>
                      <strong>Premium Laptop</strong>
                      <small className="super-admin-badge">👑 Super Admin</small>
                    </td>
                    <td>gichehalawrence@gmail.com</td>
                    <td>$999.99</td>
                    <td>N/A</td>
                    <td>🏆 #1 Rank</td>
                    <td><span className="status-badge active">Active</span></td>
                    <td>
                      <span className="special-feature">Top Rank Always</span>
                    </td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn edit">Edit</button>
                    </td>
                  </tr>
                  <tr>
                    <td>PROD-001</td>
                    <td>Wireless Headphones</td>
                    <td>Sarah Smith</td>
                    <td>$89.99</td>
                    <td>🚀 500 Boost</td>
                    <td>#2 Rank</td>
                    <td><span className="status-badge active">Active</span></td>
                    <td>-</td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn edit">Edit</button>
                    </td>
                  </tr>
                  <tr>
                    <td>PROD-002</td>
                    <td>Smart Watch</td>
                    <td>John Doe</td>
                    <td>$199.99</td>
                    <td>🚀 300 Boost</td>
                    <td>#3 Rank</td>
                    <td><span className="status-badge active">Active</span></td>
                    <td>-</td>
                    <td>
                      <button className="admin-action-btn view">View</button>
                      <button className="admin-action-btn edit">Edit</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="admin-note">
              <p>
                <strong>Note:</strong> Products uploaded through the super admin account (gichehalawrence@gmail.com) 
                automatically rank first in their respective categories and do not require boost sales.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Platform Settings</h2>
            
            <div className="settings-sections">
              <div className="settings-section">
                <h3>💰 Revenue Settings</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Platform Commission Rate (%)</label>
                    <input type="number" defaultValue="8" min="0" max="30" step="0.5" />
                    <small>Percentage taken from each sale (current: 8%)</small>
                  </div>
                  <div className="form-group">
                    <label>Affiliate Commission Rate (%)</label>
                    <input type="number" defaultValue="20" min="0" max="50" step="0.5" />
                    <small>Percentage paid to affiliates (current: 20%)</small>
                  </div>
                  <div className="form-group">
                    <label>Company Airtel Money Number</label>
                    <input type="text" defaultValue="254105441783" readOnly />
                    <small>All deposits are sent to this number</small>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>🚀 Boost Sales Settings</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Daily Boost Price ($)</label>
                    <input type="number" defaultValue="10" min="1" max="100" />
                  </div>
                  <div className="form-group">
                    <label>Weekly Boost Price ($)</label>
                    <input type="number" defaultValue="50" min="1" max="500" />
                  </div>
                  <div className="form-group">
                    <label>Monthly Boost Price ($)</label>
                    <input type="number" defaultValue="150" min="1" max="1000" />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>🔗 Link Tracking Settings</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Link Tracking Duration (hours)</label>
                    <input type="number" defaultValue="24" min="1" max="168" />
                    <small>How long generated links track data (current: 24 hours)</small>
                  </div>
                  <div className="form-group">
                    <label>Maximum Links Per Day</label>
                    <input type="number" defaultValue="100" min="1" max="1000" />
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>👑 Super Admin Settings</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Super Admin Email</label>
                    <input type="email" defaultValue="gichehalawrence@gmail.com" readOnly />
                    <small>This email has special privileges</small>
                  </div>
                  <div className="form-group">
                    <label>Automatic Top Ranking</label>
                    <div className="checkbox-group">
                      <input type="checkbox" id="top-ranking" defaultChecked disabled />
                      <label htmlFor="top-ranking">Super admin products always rank first</label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Revenue Dashboard Access</label>
                    <div className="checkbox-group">
                      <input type="checkbox" id="revenue-access" defaultChecked disabled />
                      <label htmlFor="revenue-access">Enable revenue tracking dashboard</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="save-settings-btn">💾 Save All Settings</button>
              <button className="reset-settings-btn">🔄 Reset to Default</button>
              <button className="backup-btn">💾 Backup Settings</button>
            </div>

            <div className="deposit-info-card">
              <h3>💰 Deposit Information</h3>
              <div className="deposit-details">
                <p><strong>All platform revenue is deposited to:</strong></p>
                <p className="deposit-number">📱 Airtel Money: 254105441783</p>
                <p><strong>Payment Methods Accepted:</strong></p>
                <ul>
                  <li>PayPal - Global payments</li>
                  <li>Stripe - Credit/Debit cards</li>
                  <li>Airtel Money - Mobile payments</li>
                  <li>Bank Transfer - Direct deposits</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;