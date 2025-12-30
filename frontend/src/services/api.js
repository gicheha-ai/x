import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          // Forbidden - show access denied message
          console.error('Access denied:', error.response.data.message);
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        case 429:
          // Too many requests
          console.error('Too many requests. Please try again later.');
          break;
        case 500:
          // Server error
          console.error('Server error. Please try again later.');
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error. Please check your connection.');
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods for different endpoints
export const authApi = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  validateToken: (token) => api.get('/api/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/api/auth/reset-password', { token, newPassword }),
};

export const userApi = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (userData) => api.put('/api/users/profile', userData),
  becomeSeller: () => api.post('/api/users/become-seller'),
  getDashboardStats: () => api.get('/api/users/dashboard-stats'),
};

export const productApi = {
  getAllProducts: (params) => api.get('/api/products', { params }),
  getProduct: (id) => api.get(`/api/products/${id}`),
  createProduct: (productData) => api.post('/api/products', productData),
  updateProduct: (id, productData) => api.put(`/api/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/api/products/${id}`),
  searchProducts: (query, filters) => api.get('/api/products/search', { params: { q: query, ...filters } }),
  getCategories: () => api.get('/api/categories'),
  getProductsByCategory: (categoryId) => api.get(`/api/categories/${categoryId}/products`),
  getBoostedProducts: () => api.get('/api/products/boosted'),
  getSuperAdminProducts: () => api.get('/api/products/super-admin'),
};

export const orderApi = {
  createOrder: (orderData) => api.post('/api/orders', orderData),
  getOrders: (params) => api.get('/api/orders', { params }),
  getOrder: (id) => api.get(`/api/orders/${id}`),
  cancelOrder: (id) => api.put(`/api/orders/${id}/cancel`),
  updateOrderStatus: (id, status) => api.put(`/api/orders/${id}/status`, { status }),
};

export const paymentApi = {
  createPayment: (paymentData) => api.post('/api/payments/create', paymentData),
  processStripe: (paymentData) => api.post('/api/payments/stripe', paymentData),
  processPayPal: (paymentData) => api.post('/api/payments/paypal', paymentData),
  processAirtelMoney: (paymentData) => api.post('/api/payments/airtel-money', paymentData),
  processBankTransfer: (paymentData) => api.post('/api/payments/bank-transfer', paymentData),
  getPaymentMethods: () => api.get('/api/payments/methods'),
  getPaymentHistory: () => api.get('/api/payments/history'),
};

export const revenueApi = {
  getRevenueSummary: () => api.get('/api/revenue/summary'),
  getAnalytics: (period) => api.get(`/api/revenue/analytics?period=${period}`),
  getTransactions: (filters) => api.get('/api/revenue/transactions', { params: filters }),
  generateReport: (startDate, endDate, format) => api.get(
    `/api/revenue/report?start=${startDate}&end=${endDate}&format=${format}`
  ),
};

export const linkApi = {
  generateTrackingLink: () => api.post('/api/links/generate'),
  getTrackingLinks: () => api.get('/api/links'),
  getLinkStats: (linkId) => api.get(`/api/links/${linkId}/stats`),
  deleteLink: (linkId) => api.delete(`/api/links/${linkId}`),
};

export const boostApi = {
  boostProduct: (productId, boostData) => api.post(`/api/boost/${productId}`, boostData),
  getBoostPlans: () => api.get('/api/boost/plans'),
  getBoostedProducts: () => api.get('/api/boost/active'),
  cancelBoost: (boostId) => api.delete(`/api/boost/${boostId}`),
  getBoostHistory: () => api.get('/api/boost/history'),
};

export const affiliateApi = {
  joinProgram: () => api.post('/api/affiliate/join'),
  getDashboard: () => api.get('/api/affiliate/dashboard'),
  getCommissions: () => api.get('/api/affiliate/commissions'),
  generateAffiliateLink: () => api.post('/api/affiliate/generate-link'),
  withdrawEarnings: (amount) => api.post('/api/affiliate/withdraw', { amount }),
  getReferrals: () => api.get('/api/affiliate/referrals'),
};

export default api;
