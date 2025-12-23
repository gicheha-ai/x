import { authApi } from './api';

export const authService = {
  login: async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  },

  register: async (userData) => {
    try {
      const response = await authApi.register(userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  validateToken: async (token) => {
    try {
      const response = await authApi.validateToken(token);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Token validation failed' };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await authApi.forgotPassword(email);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Password reset failed' };
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await authApi.resetPassword(token, newPassword);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Password reset failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true, message: 'Logged out successfully' };
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  isSuperAdmin: () => {
    const user = authService.getCurrentUser();
    return user?.email === 'gichehalawrence@gmail.com';
  },

  updateLocalUser: (userData) => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  }
};