import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import UserDashboard from './UserDashboard';
import SellerDashboard from './SellerDashboard';
import AdminDashboard from './AdminDashboard';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Determine dashboard type based on user role
  const renderDashboard = () => {
    // Super admin check
    if (user.email === 'gichehalawrence@gmail.com') {
      return <AdminDashboard />;
    }
    
    // Check user role from user object
    if (user.role === 'seller') {
      return <SellerDashboard />;
    }
    
    if (user.role === 'affiliate') {
      // For affiliates, show affiliate portal
      return <Navigate to="/affiliate" />;
    }
    
    // Default to regular user dashboard
    return <UserDashboard />;
  };

  return (
    <div className="dashboard-wrapper">
      <Routes>
        <Route path="/" element={renderDashboard()} />
        <Route path="/user" element={<UserDashboard />} />
        <Route path="/seller" element={<SellerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default Dashboard;