const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const logger = require('./utils/logger');

// Store connected users
const connectedUsers = new Map();

/**
 * Initialize Socket.IO with authentication and event handlers
 * @param {Object} io - Socket.IO instance
 */
const initializeSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userEmail = socket.user.email;
    
    logger.info(`Socket connected: ${userEmail} (${socket.id})`);
    
    // Store user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date(),
      room: userId // User's private room
    });
    
    // Join user's private room
    socket.join(userId);
    
    // Join admin room if user is admin
    if (socket.user.role === 'admin' || socket.user.email === process.env.SUPER_ADMIN_EMAIL) {
      socket.join('admin-room');
      logger.info(`Admin joined room: ${userEmail}`);
    }
    
    // Join seller room if user is seller
    if (socket.user.role === 'seller') {
      socket.join('seller-room');
    }
    
    // Notify user of successful connection
    socket.emit('connected', {
      message: 'Connected to E-Commerce Pro Platform',
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Notify admins of new connection (for super admin dashboard)
    if (socket.user.role !== 'admin') {
      socket.to('admin-room').emit('user-connected', {
        userId,
        email: userEmail,
        role: socket.user.role,
        timestamp: new Date().toISOString()
      });
    }
    
    // Real-time revenue updates (super admin only)
    if (socket.user.email === process.env.SUPER_ADMIN_EMAIL) {
      socket.on('request-revenue-update', () => {
        // Emit revenue update (this would be connected to actual revenue service)
        socket.emit('revenue-update', {
          total: 12450,
          today: 480,
          boostedProducts: 42,
          affiliateCommissions: 2150,
          subscriptions: 1850,
          timestamp: new Date().toISOString()
        });
      });
    }
    
    // Order status updates
    socket.on('subscribe-to-order', (orderId) => {
      socket.join(`order-${orderId}`);
      logger.info(`User ${userEmail} subscribed to order ${orderId}`);
    });
    
    // Product updates (for sellers)
    socket.on('subscribe-to-product', (productId) => {
      socket.join(`product-${productId}`);
    });
    
    // Chat/messaging
    socket.on('send-message', async (data) => {
      const { to, message } = data;
      
      // Check if recipient is connected
      const recipient = connectedUsers.get(to);
      
      if (recipient) {
        // Send to recipient
        io.to(recipient.socketId).emit('new-message', {
          from: userId,
          fromEmail: userEmail,
          message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Also emit to sender (for UI update)
      socket.emit('message-sent', {
        to,
        message,
        timestamp: new Date().toISOString()
      });
    });
    
    // Boost sales notifications
    socket.on('boost-product', (data) => {
      const { productId, boostType } = data;
      
      // Notify admins about boost purchase
      socket.to('admin-room').emit('product-boosted', {
        productId,
        boostType,
        userId,
        userEmail,
        timestamp: new Date().toISOString()
      });
      
      // Update product ranking in real-time
      io.emit('product-ranking-updated', {
        productId,
        action: 'boosted',
        boostType,
        timestamp: new Date().toISOString()
      });
    });
    
    // Affiliate link clicks tracking
    socket.on('affiliate-click', (data) => {
      const { linkId, productId } = data;
      
      // Track affiliate click in real-time
      socket.to('admin-room').emit('affiliate-click-tracked', {
        linkId,
        productId,
        userId,
        timestamp: new Date().toISOString()
      });
    });
    
    // Real-time cart updates
    socket.on('cart-updated', (data) => {
      const { cartId, itemCount, total } = data;
      
      // User-specific cart updates
      socket.emit('cart-update', {
        cartId,
        itemCount,
        total,
        timestamp: new Date().toISOString()
      });
    });
    
    // Live support/chat rooms
    socket.on('join-support-room', (roomId) => {
      socket.join(`support-${roomId}`);
      logger.info(`User ${userEmail} joined support room ${roomId}`);
    });
    
    socket.on('support-message', (data) => {
      const { roomId, message } = data;
      
      io.to(`support-${roomId}`).emit('support-message', {
        from: userId,
        fromEmail: userEmail,
        message,
        timestamp: new Date().toISOString()
      });
    });
    
    // Disconnection handler
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userEmail} (${socket.id})`);
      
      // Remove from connected users
      connectedUsers.delete(userId);
      
      // Notify admins of disconnection
      socket.to('admin-room').emit('user-disconnected', {
        userId,
        email: userEmail,
        timestamp: new Date().toISOString()
      });
    });
    
    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Helper functions to emit events from other parts of the app
  const socketService = {
    /**
     * Send notification to a specific user
     */
    sendToUser: (userId, event, data) => {
      const user = connectedUsers.get(userId);
      if (user) {
        io.to(user.socketId).emit(event, data);
      }
    },
    
    /**
     * Send notification to all users in a room
     */
    sendToRoom: (room, event, data) => {
      io.to(room).emit(event, data);
    },
    
    /**
     * Send notification to all connected users
     */
    broadcast: (event, data) => {
      io.emit(event, data);
    },
    
    /**
     * Get all connected users
     */
    getConnectedUsers: () => {
      return Array.from(connectedUsers.values()).map(user => ({
        userId: user.user._id,
        email: user.user.email,
        role: user.user.role,
        connectedAt: user.connectedAt
      }));
    },
    
    /**
     * Check if a user is connected
     */
    isUserConnected: (userId) => {
      return connectedUsers.has(userId);
    },
    
    /**
     * Emit order status update
     */
    emitOrderUpdate: (orderId, status, data = {}) => {
      io.to(`order-${orderId}`).emit('order-status-update', {
        orderId,
        status,
        ...data,
        timestamp: new Date().toISOString()
      });
      
      // Also notify admins
      io.to('admin-room').emit('order-updated', {
        orderId,
        status,
        ...data,
        timestamp: new Date().toISOString()
      });
    },
    
    /**
     * Emit product update
     */
    emitProductUpdate: (productId, updateType, data = {}) => {
      io.to(`product-${productId}`).emit('product-update', {
        productId,
        updateType,
        ...data,
        timestamp: new Date().toISOString()
      });
      
      // Notify all users about product changes (for boosted products)
      if (updateType === 'boosted' || updateType === 'sold') {
        io.emit('product-feed-update', {
          productId,
          updateType,
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    /**
     * Emit revenue update to super admin
     */
    emitRevenueUpdate: (revenueData) => {
      io.to('admin-room').emit('revenue-update', {
        ...revenueData,
        timestamp: new Date().toISOString()
      });
    },
    
    /**
     * Emit affiliate commission update
     */
    emitAffiliateUpdate: (affiliateId, commissionData) => {
      const affiliate = connectedUsers.get(affiliateId);
      if (affiliate) {
        io.to(affiliate.socketId).emit('commission-update', {
          ...commissionData,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    /**
     * Emit system notification
     */
    emitNotification: (userId, notification) => {
      const user = connectedUsers.get(userId);
      if (user) {
        io.to(user.socketId).emit('notification', {
          ...notification,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  // Make socket service available globally
  global.socketService = socketService;
  
  return socketService;
};

module.exports = { initializeSocket };