import { orderApi } from './api';

export const orderService = {
  createOrder: async (orderData) => {
    try {
      const response = await orderApi.createOrder(orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create order' };
    }
  },

  getOrders: async (params = {}) => {
    try {
      const response = await orderApi.getOrders(params);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch orders' };
    }
  },

  getOrder: async (orderId) => {
    try {
      const response = await orderApi.getOrder(orderId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Order not found' };
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const response = await orderApi.cancelOrder(orderId);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to cancel order' };
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await orderApi.updateOrderStatus(orderId, status);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update order status' };
    }
  },

  calculateOrderSummary: (items, shippingCost = 0) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% transaction fee
    const total = subtotal + shippingCost + tax;
    
    return {
      subtotal,
      shipping: shippingCost,
      tax,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  },

  generateOrderNumber: () => {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  },

  validateOrderData: (orderData) => {
    const errors = [];
    
    if (!orderData.shippingAddress) {
      errors.push('Shipping address is required');
    }
    
    if (!orderData.paymentMethod) {
      errors.push('Payment method is required');
    }
    
    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getOrderStatusColor: (status) => {
    const colors = {
      'pending': 'warning',
      'processing': 'info',
      'shipped': 'primary',
      'delivered': 'success',
      'cancelled': 'danger',
      'refunded': 'secondary'
    };
    return colors[status] || 'secondary';
  },

  getOrderStatusText: (status) => {
    const texts = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return texts[status] || 'Unknown';
  },

  // For sellers to get their orders
  getSellerOrders: async (params = {}) => {
    try {
      const response = await orderApi.getOrders({ ...params, seller: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch seller orders' };
    }
  },

  // For buyers to get their orders
  getBuyerOrders: async (params = {}) => {
    try {
      const response = await orderApi.getOrders({ ...params, buyer: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch buyer orders' };
    }
  }
};
