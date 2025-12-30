import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRevenue } from '../../../hooks/useRevenue';
import { useLinkGenerator } from '../../../hooks/useLinkGenerator';
import './RevenueDashboard.css';

const RevenueDashboard = () => {
  const { user } = useAuth();
  const { revenue, fetchRevenue, loading: revenueLoading } = useRevenue();
  const { links, generateLink, fetchLinks, loading: linksLoading } = useLinkGenerator();
  
  const [timeRange, setTimeRange] = useState('daily');
  const [newLinkName, setNewLinkName] = useState('');

  useEffect(() => {
    if (user && user.email === 'gichehalawrence@gmail.com') {
      fetchRevenue(timeRange);
      fetchLinks();
    }
  }, [user, timeRange]);

  const handleGenerateLink = async () => {
    if (newLinkName.trim()) {
      await generateLink(newLinkName);
      setNewLinkName('');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user || user.email !== 'gichehalawrence@gmail.com') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>This dashboard is only accessible to the super admin.</p>
      </div>
    );
  }

  return (
    <div className="revenue-dashboard">
      <div className="dashboard-header">
        <h1>💰 Revenue Dashboard</h1>
        <p>Super Admin: {user.email}</p>
        <div className="time-range-selector">
          <button 
            className={timeRange === 'daily' ? 'active' : ''}
            onClick={() => setTimeRange('daily')}
          >
            Daily
          </button>
          <button 
            className={timeRange === 'weekly' ? 'active' : ''}
            onClick={() => setTimeRange('weekly')}
          >
            Weekly
          </button>
          <button 
            className={timeRange === 'monthly' ? 'active' : ''}
            onClick={() => setTimeRange('monthly')}
          >
            Monthly
          </button>
        </div>
      </div>

      {revenueLoading ? (
        <div className="loading">Loading revenue data...</div>
      ) : (
        <div className="revenue-stats">
          <div className="stat-card total-revenue">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>Total Revenue</h3>
              <p className="stat-value">{formatCurrency(revenue?.total || 0)}</p>
              <p className="stat-change">+12% from last {timeRange}</p>
            </div>
          </div>

          <div className="stat-card boost-revenue">
            <div className="stat-icon">🚀</div>
            <div className="stat-content">
              <h3>Boost Sales</h3>
              <p className="stat-value">{formatCurrency(revenue?.boostSales || 0)}</p>
              <p className="stat-detail">{revenue?.boostCount || 0} boosted products</p>
            </div>
          </div>

          <div className="stat-card commission-revenue">
            <div className="stat-icon">🤝</div>
            <div className="stat-content">
              <h3>Commissions</h3>
              <p className="stat-value">{formatCurrency(revenue?.commissions || 0)}</p>
              <p className="stat-detail">{revenue?.transactionCount || 0} transactions</p>
            </div>
          </div>

          <div className="stat-card subscription-revenue">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <h3>Subscriptions</h3>
              <p className="stat-value">{formatCurrency(revenue?.subscriptions || 0)}</p>
              <p className="stat-detail">{revenue?.subscriberCount || 0} subscribers</p>
            </div>
          </div>
        </div>
      )}

      <div className="link-generator-section">
        <h2>🔗 Link Generator</h2>
        <div className="link-generator">
          <input
            type="text"
            value={newLinkName}
            onChange={(e) => setNewLinkName(e.target.value)}
            placeholder="Enter link name (e.g., Facebook Ad)"
            className="link-input"
          />
          <button onClick={handleGenerateLink} className="generate-button">
            Generate Link
          </button>
        </div>

        {linksLoading ? (
          <div className="loading">Loading links...</div>
        ) : (
          <div className="links-list">
            <h3>Generated Links (24-hour tracking)</h3>
            {links.length === 0 ? (
              <p className="no-links">No links generated yet.</p>
            ) : (
              <div className="links-table">
                <div className="table-header">
                  <div>Link Name</div>
                  <div>Clicks</div>
                  <div>Conversions</div>
                  <div>Revenue</div>
                  <div>Expires</div>
                </div>
                {links.map((link, index) => (
                  <div key={index} className="table-row">
                    <div className="link-name">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.name}
                      </a>
                      <button 
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(link.url)}
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="link-clicks">{link.clicks}</div>
                    <div className="link-conversions">{link.conversions}</div>
                    <div className="link-revenue">{formatCurrency(link.revenue)}</div>
                    <div className="link-expiry">{link.expires}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="deposit-info">
        <h3>💳 Deposit Information</h3>
        <p>All revenue deposits are sent to:</p>
        <div className="deposit-details">
          <p><strong>Mobile Number:</strong> 254105441783 (Airtel Money)</p>
          <p><strong>Payment Methods Accepted:</strong> PayPal, Stripe, Bank Transfer</p>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboard;
