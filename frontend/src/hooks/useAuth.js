import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for authentication
 * Provides auth state and methods
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
};

/**
 * Hook to check if user is super admin
 */
export const useIsSuperAdmin = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === 'gichehalawrence@gmail.com';
  return { isSuperAdmin, email: user?.email };
};

/**
 * Hook to get user permissions
 */
export const useUserPermissions = () => {
  const { user } = useAuth();
  
  const permissions = {
    canSell: user?.accountType === 'seller' || user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canAffiliate: user?.accountType === 'affiliate' || user?.accountType === 'seller' || user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canAdmin: user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canBoost: user?.accountType === 'seller' || user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canWithdraw: user?.accountType === 'seller' || user?.accountType === 'affiliate' || user?.accountType === 'admin',
    canViewRevenue: user?.email === 'gichehalawrence@gmail.com',
    canGenerateLinks: user?.email === 'gichehalawrence@gmail.com',
    canManageUsers: user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canManageProducts: user?.accountType === 'seller' || user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com',
    canManageOrders: user?.accountType === 'seller' || user?.accountType === 'admin' || user?.email === 'gichehalawrence@gmail.com'
  };
  
  return permissions;
};

/**
 * Hook for authentication actions
 */
export const useAuthActions = () => {
  const { login, register, logout, setError } = useAuth();
  
  const handleLogin = async (email, password) => {
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect based on user type
        const user = result.user;
        
        if (user.email === 'gichehalawrence@gmail.com') {
          window.location.href = '/admin/dashboard';
        } else if (user.accountType === 'seller') {
          window.location.href = '/seller/dashboard';
        } else if (user.accountType === 'affiliate') {
          window.location.href = '/affiliate/dashboard';
        } else {
          window.location.href = '/';
        }
        
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };
  
  const handleRegister = async (userData) => {
    try {
      const result = await register(userData);
      
      if (result.success) {
        // Auto-login after registration
        const loginResult = await handleLogin(userData.email, userData.password);
        return loginResult;
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  };
  
  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };
  
  const clearError = () => {
    setError(null);
  };
  
  return {
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError
  };
};

/**
 * Hook to check auth status and redirect if needed
 */
export const useAuthGuard = (options = {}) => {
  const { requireAuth = false, requireRole = null, redirectTo = '/login' } = options;
  const { user, loading } = useAuth();
  
  if (loading) {
    return { loading: true, authorized: false, user: null };
  }
  
  let authorized = true;
  
  // Check if authentication is required
  if (requireAuth && !user) {
    authorized = false;
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
  
  // Check if specific role is required
  if (requireRole && user) {
    if (requireRole === 'super_admin' && user.email !== 'gichehalawrence@gmail.com') {
      authorized = false;
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    } else if (requireRole !== 'super_admin' && user.accountType !== requireRole) {
      authorized = false;
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    }
  }
  
  return {
    loading: false,
    authorized,
    user,
    isSuperAdmin: user?.email === 'gichehalawrence@gmail.com'
  };
};

/**
 * Hook to get current user profile
 */
export const useUserProfile = () => {
  const { user } = useAuth();
  
  const profile = user ? {
    id: user._id || user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    accountType: user.accountType,
    avatar: user.avatar,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    sellerProfile: user.sellerProfile,
    affiliateProfile: user.affiliateProfile,
    preferences: user.preferences || {}
  } : null;
  
  return profile;
};

/**
 * Hook for user account management
 */
export const useAccountManagement = () => {
  const { user } = useAuth();
  
  const canBecomeSeller = user?.accountType === 'buyer';
  const canBecomeAffiliate = user?.accountType === 'buyer' || user?.accountType === 'seller';
  
  const upgradeToSeller = async () => {
    try {
      // This would call an API endpoint to upgrade account
      // For now, return mock response
      return {
        success: true,
        message: 'Account upgraded to seller successfully',
        accountType: 'seller'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upgrade account'
      };
    }
  };
  
  const joinAffiliateProgram = async () => {
    try {
      // This would call an API endpoint to join affiliate program
      return {
        success: true,
        message: 'Joined affiliate program successfully',
        accountType: 'affiliate'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to join affiliate program'
      };
    }
  };
  
  const updateProfile = async (profileData) => {
    try {
      // This would call an API endpoint to update profile
      return {
        success: true,
        message: 'Profile updated successfully',
        data: profileData
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update profile'
      };
    }
  };
  
  return {
    canBecomeSeller,
    canBecomeAffiliate,
    upgradeToSeller,
    joinAffiliateProgram,
    updateProfile
  };
};