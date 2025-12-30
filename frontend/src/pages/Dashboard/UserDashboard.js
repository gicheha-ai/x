import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../../hooks/useCart';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Dashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const { cart } = useCart();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setLoading(false);
      // Mock data
      setOrders([
        {
          id: 'ORD-001',
          date: '2024-01-15',
          items: 3,
          total: 149.99,
          status: 'Delivered',
          tracking: 'TRK-123456'
        },
        {
          id: 'ORD-002',
          date: '2024-01-10',
          items: 1,
          total: 49.99,
          status: 'Processing',
          tracking: 'TRK-123457'
        }
      ]);
      
      setWishlist([
        {
          id: 'PROD-001',
          name: 'Wireless Headphones',
          price: 89.99,
          addedDate: '2024-01-12',
          image: 'https://via.placeholder.com/100'
        },
        {
          id: 'PROD-002',
          name: 'Smart Watch',
          price: 199.99,
          addedDate: '2024-01-08',
          image: 'https://via.placeholder.com/100'
        }
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading your dashboard..." />;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="user-greeting">
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p>Here's your personal dashboard</p>
        </div>
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-content">
              <h3>Cart Items</h3>
              <p className="stat-value">{cart?.items?.length || 0}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>Orders</h3>
              <p className="stat-value">{orders.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❤️</div>
            <div className="stat-content">
              <h3>Wishlist</h3>
              <p className="stat-value">{wishlist.length}</p>
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
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders
        </button>
        <button 
          className={`tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('wishlist')}
        >
          ❤️ Wishlist
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="recent-orders">
              <h2>Recent Orders</h2>
              {orders.length > 0 ? (
                <div className="orders-list">
                  {orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <span className="order-id">{order.id}</span>
                        <span className={`order-status ${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="order-details">
                        <p>Date: {order.date}</p>
                        <p>Items: {order.items}</p>
                        <p>Total: ${order.total.toFixed(2)}</p>
                      </div>
                      <div className="order-actions">
                        <button className="view-order-btn">View Details</button>
                        <button className="track-order-btn">Track Order</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No orders yet. Start shopping!</p>
              )}
            </div>

            <div className="account-summary">
              <h2>Account Summary</h2>
              <div className="summary-card">
                <div className="summary-item">
                  <span>Member Since:</span>
                  <span>January 2024</span>
                </div>
                <div className="summary-item">
                  <span>Total Spent:</span>
                  <span>$199.98</span>
                </div>
                <div className="summary-item">
                  <span>Email Verified:</span>
                  <span className="verified">Yes ✅</span>
                </div>
                <div className="summary-item">
                  <span>Phone Verified:</span>
                  <span className="verified">Yes ✅</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-tab">
            <h2>Order History</h2>
            {orders.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.date}</td>
                      <td>{order.items}</td>
                      <td>${order.total.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn view">View</button>
                        <button className="action-btn track">Track</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-orders">
                <p>You haven't placed any orders yet.</p>
                <button className="shop-now-btn">Start Shopping</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="wishlist-tab">
            <h2>Your Wishlist</h2>
            {wishlist.length > 0 ? (
              <div className="wishlist-grid">
                {wishlist.map(item => (
                  <div key={item.id} className="wishlist-item">
                    <img src={item.image} alt={item.name} className="item-image" />
                    <div className="item-details">
                      <h3>{item.name}</h3>
                      <p className="item-price">${item.price.toFixed(2)}</p>
                      <p className="item-added">Added: {item.addedDate}</p>
                    </div>
                    <div className="item-actions">
                      <button className="add-to-cart-btn">Add to Cart</button>
                      <button className="remove-btn">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-wishlist">
                <p>Your wishlist is empty.</p>
                <button className="browse-btn">Browse Products</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Account Settings</h2>
            <div className="settings-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" defaultValue={user?.name || ''} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" defaultValue={user?.email || ''} readOnly />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" defaultValue={user?.phone || ''} />
              </div>
              <div className="form-group">
                <label>Change Password</label>
                <input type="password" placeholder="Enter new password" />
              </div>
              <button className="save-btn">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
