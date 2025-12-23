import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './AffiliatePortal.css';

const AffiliatePortal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [affiliateStats, setAffiliateStats] = useState({
    totalEarnings: 0,
    pendingBalance: 0,
    totalReferrals: 0,
    conversionRate: 0,
    commissionRate: 20, // 20% commission
    performanceScore: 0
  });
  const [referrals, setReferrals] = useState([]);
  const [products, setProducts] = useState([]);
  const [affiliateLink, setAffiliateLink] = useState('');

  useEffect(() => {
    // Simulate loading affiliate data
    const timer = setTimeout(() => {
      setLoading(false);
      
      // Mock affiliate stats
      setAffiliateStats({
        totalEarnings: 850.50,
        pendingBalance: 125.75,
        totalReferrals: 45,
        conversionRate: 12.5,
        commissionRate: 20,
        performanceScore: 85
      });
      
      // Mock referrals
      setReferrals([
        {
          id: 'REF-001',
          name: 'John Smith',
          email: 'john@example.com',
          joined: '2024-01-15',
          purchases: 3,
          commission: 45.50,
          status: 'Active'
        },
        {
          id: 'REF-002',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          joined: '2024-01-10',
          purchases: 1,
          commission: 15.99,
          status: 'Active'
        },
        {
          id: 'REF-003',
          name: 'Mike Brown',
          email: 'mike@example.com',
          joined: '2024-01-05',
          purchases: 0,
          commission: 0,
          status: 'Pending'
        }
      ]);
      
      // Mock products for promotion
      setProducts([
        {
          id: 'PROD-001',
          name: 'Wireless Headphones',
          price: 89.99,
          commission: 18.00,
          conversionRate: 15,
          affiliateLink: 'https://ecommerce.com/product/001?ref=affiliate123'
        },
        {
          id: 'PROD-002',
          name: 'Smart Watch',
          price: 199.99,
          commission: 40.00,
          conversionRate: 22,
          affiliateLink: 'https://ecommerce.com/product/002?ref=affiliate123'
        },
        {
          id: 'PROD-003',
          name: 'Phone Case',
          price: 19.99,
          commission: 4.00,
          conversionRate: 35,
          affiliateLink: 'https://ecommerce.com/product/003?ref=affiliate123'
        }
      ]);
      
      // Generate affiliate link
      if (user) {
        setAffiliateLink(`https://ecommerce.com/?ref=affiliate_${user.id}`);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleCopyLink = async () => {
    if (affiliateLink) {
      await navigator.clipboard.writeText(affiliateLink);
      alert('Affiliate link copied to clipboard!');
    }
  };

  const handleWithdraw = () => {
    if (affiliateStats.pendingBalance >= 50) {
      alert(`Withdrawal request submitted for $${affiliateStats.pendingBalance.toFixed(2)}`);
    } else {
      alert(`Minimum withdrawal amount is $50. Current balance: $${affiliateStats.pendingBalance.toFixed(2)}`);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading affiliate portal..." />;
  }

  return (
    <div className="affiliate-container">
      <div className="affiliate-header">
        <div className="affiliate-greeting">
          <h1>🤝 Affiliate Portal</h1>
          <p>Earn commissions by promoting products</p>
        </div>
        
        <div className="affiliate-link-card">
          <div className="link-content">
            <h3>Your Affiliate Link</h3>
            <div className="link-display">
              <code>{affiliateLink}</code>
              <button onClick={handleCopyLink} className="copy-link-btn">
                📋 Copy Link
              </button>
            </div>
            <p className="link-note">
              Share this link anywhere! Earn {affiliateStats.commissionRate}% commission on every sale.
            </p>
          </div>
        </div>
      </div>

      <div className="affiliate-stats">
        <div className="stat-card earnings-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Earnings</h3>
            <p className="stat-value">${affiliateStats.totalEarnings.toFixed(2)}</p>
            <p className="stat-detail">Lifetime commissions</p>
          </div>
        </div>
        
        <div className="stat-card balance-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h3>Available Balance</h3>
            <p className="stat-value">${affiliateStats.pendingBalance.toFixed(2)}</p>
            <p className="stat-detail">Min. $50 to withdraw</p>
          </div>
        </div>
        
        <div className="stat-card referrals-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Referrals</h3>
            <p className="stat-value">{affiliateStats.totalReferrals}</p>
            <p className="stat-detail">Active referrals</p>
          </div>
        </div>
        
        <div className="stat-card performance-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Performance Score</h3>
            <p className="stat-value">{affiliateStats.performanceScore}%</p>
            <p className="stat-detail">Conversion: {affiliateStats.conversionRate}%</p>
          </div>
        </div>
      </div>

      <div className="affiliate-tabs">
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
          🏪 Promote Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          👥 My Referrals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
          onClick={() => setActiveTab('earnings')}
        >
          💰 Earnings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
          onClick={() => setActiveTab('tools')}
        >
          🔧 Marketing Tools
        </button>
      </div>

      <div className="affiliate-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="quick-actions">
              <h2>Quick Start</h2>
              <div className="action-cards">
                <div className="action-card">
                  <div className="action-icon">🔗</div>
                  <div className="action-text">
                    <h4>Share Your Link</h4>
                    <p>Share your affiliate link on social media, emails, or websites</p>
                  </div>
                </div>
                <div className="action-card">
                  <div className="action-icon">🏪</div>
                  <div className="action-text">
                    <h4>Promote Products</h4>
                    <p>Choose products to promote with special affiliate links</p>
                  </div>
                </div>
                <div className="action-card">
                  <div className="action-icon">📊</div>
                  <div className="action-text">
                    <h4>Track Performance</h4>
                    <p>Monitor clicks, conversions, and earnings in real-time</p>
                  </div>
                </div>
                <div className="action-card">
                  <div className="action-icon">💰</div>
                  <div className="action-text">
                    <h4>Withdraw Earnings</h4>
                    <p>Withdraw your earnings when you reach $50 minimum</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="commission-info">
              <h2>💰 Commission Structure</h2>
              <div className="commission-card">
                <div className="commission-rate">
                  <h3>{affiliateStats.commissionRate}% Commission</h3>
                  <p>On every sale referred through your link</p>
                </div>
                <div className="commission-details">
                  <h4>How it works:</h4>
                  <ul>
                    <li>Earn {affiliateStats.commissionRate}% of every sale you refer</li>
                    <li>Commission is calculated on the total sale amount</li>
                    <li>Payments are processed weekly</li>
                    <li>Minimum withdrawal: $50</li>
                    <li>No maximum earning limit</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="withdraw-section">
              <h2>💳 Withdraw Earnings</h2>
              <div className="withdraw-card">
                <div className="balance-display">
                  <p>Available Balance:</p>
                  <p className="balance-amount">${affiliateStats.pendingBalance.toFixed(2)}</p>
                </div>
                <div className="withdraw-requirements">
                  <p><strong>Withdrawal Requirements:</strong></p>
                  <ul>
                    <li>Minimum withdrawal: $50</li>
                    <li>Payments processed every Tuesday</li>
                    <li>Payment methods: PayPal, Bank Transfer</li>
                    <li>No withdrawal fees</li>
                  </ul>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={affiliateStats.pendingBalance < 50}
                  className="withdraw-btn"
                >
                  {affiliateStats.pendingBalance >= 50 ? '💰 Request Withdrawal' : 'Minimum $50 Required'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="products-tab">
            <h2>Products to Promote</h2>
            <p className="section-description">
              Promote these products to earn {affiliateStats.commissionRate}% commission on each sale.
            </p>
            
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-header">
                    <h3>{product.name}</h3>
                    <span className="product-price">${product.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="product-commission">
                    <p><strong>Commission per sale:</strong> ${product.commission.toFixed(2)}</p>
                    <p><strong>Conversion rate:</strong> {product.conversionRate}%</p>
                  </div>
                  
                  <div className="product-link">
                    <p><strong>Your affiliate link:</strong></p>
                    <div className="link-display-small">
                      <code>{product.affiliateLink}</code>
                      <button className="copy-small-btn">Copy</button>
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <button className="promote-btn">📢 Promote</button>
                    <button className="share-btn">🔗 Get Shareable Link</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div className="referrals-tab">
            <h2>Your Referrals</h2>
            <div className="referrals-summary">
              <div className="summary-card">
                <h3>Referral Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Total Referrals:</span>
                    <span>{affiliateStats.totalReferrals}</span>
                  </div>
                  <div className="summary-item">
                    <span>Active Referrals:</span>
                    <span>{referrals.filter(r => r.status === 'Active').length}</span>
                  </div>
                  <div className="summary-item">
                    <span>Total Commission:</span>
                    <span>${affiliateStats.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Conversion Rate:</span>
                    <span>{affiliateStats.conversionRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="referrals-table-container">
              <table className="referrals-table">
                <thead>
                  <tr>
                    <th>Referral ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Purchases</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(referral => (
                    <tr key={referral.id}>
                      <td>{referral.id}</td>
                      <td>{referral.name}</td>
                      <td>{referral.email}</td>
                      <td>{referral.joined}</td>
                      <td>{referral.purchases}</td>
                      <td>${referral.commission.toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${referral.status.toLowerCase()}`}>
                          {referral.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            <h2>Earnings History</h2>
            <div className="earnings-chart-placeholder">
              <p>📈 Earnings chart will appear here</p>
            </div>
            
            <div className="earnings-table-container">
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Referral</th>
                    <th>Sale Amount</th>
                    <th>Commission Rate</th>
                    <th>Commission Earned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>2024-01-15</td>
                    <td>Wireless Headphones Sale</td>
                    <td>John Smith</td>
                    <td>$89.99</td>
                    <td>{affiliateStats.commissionRate}%</td>
                    <td>$18.00</td>
                    <td><span className="status-badge paid">Paid</span></td>
                  </tr>
                  <tr>
                    <td>2024-01-14</td>
                    <td>Smart Watch Sale</td>
                    <td>Sarah Johnson</td>
                    <td>$199.99</td>
                    <td>{affiliateStats.commissionRate}%</td>
                    <td>$40.00</td>
                    <td><span className="status-badge pending">Pending</span></td>
                  </tr>
                  <tr>
                    <td>2024-01-10</td>
                    <td>Phone Case Sale</td>
                    <td>Mike Brown</td>
                    <td>$19.99</td>
                    <td>{affiliateStats.commissionRate}%</td>
                    <td>$4.00</td>
                    <td><span className="status-badge paid">Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="earnings-summary">
              <div className="summary-card">
                <h3>Earnings Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Total Earnings:</span>
                    <span>${affiliateStats.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Paid Out:</span>
                    <span>${(affiliateStats.totalEarnings - affiliateStats.pendingBalance).toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Pending Balance:</span>
                    <span>${affiliateStats.pendingBalance.toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Next Payout:</span>
                    <span>Tuesday, Jan 23</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="tools-tab">
            <h2>Marketing Tools</h2>
            <p className="section-description">
              Use these tools to maximize your affiliate marketing efforts.
            </p>
            
            <div className="tools-grid">
              <div className="tool-card">
                <div className="tool-icon">🔗</div>
                <h3>Link Generator</h3>
                <p>Generate custom affiliate links for specific products</p>
                <button className="tool-btn">Generate Link</button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">📱</div>
                <h3>Social Media Posts</h3>
                <p>Pre-made social media posts with your affiliate links</p>
                <button className="tool-btn">Get Posts</button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">📧</div>
                <h3>Email Templates</h3>
                <p>Email templates for promoting products</p>
                <button className="tool-btn">View Templates</button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">📊</div>
                <h3>Analytics Dashboard</h3>
                <p>Track clicks, conversions, and earnings</p>
                <button className="tool-btn">View Analytics</button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">🏆</div>
                <h3>Leaderboard</h3>
                <p>See how you rank among other affiliates</p>
                <button className="tool-btn">View Leaderboard</button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">📚</div>
                <h3>Resources</h3>
                <p>Guides and tips for successful affiliate marketing</p>
                <button className="tool-btn">View Resources</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliatePortal;