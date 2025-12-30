// backend/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const sellerMiddleware = require('../middleware/sellerMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes (for webhook callbacks)
router.post('/webhook/:gateway',
  orderController.handleWebhook
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Customer order routes
router.get('/my-orders',
  orderController.getMyOrders
);

router.get('/:orderId',
  validationMiddleware.validateObjectId('orderId'),
  orderController.getOrder
);

router.post('/',
  orderController.createOrder
);

router.post('/:orderId/cancel',
  validationMiddleware.validateObjectId('orderId'),
  orderController.cancelOrder
);

router.post('/:orderId/return',
  validationMiddleware.validateObjectId('orderId'),
  orderController.requestReturn
);

router.get('/:orderId/invoice',
  validationMiddleware.validateObjectId('orderId'),
  orderController.downloadInvoice
);

// Digital products
router.get('/:orderId/digital-downloads',
  validationMiddleware.validateObjectId('orderId'),
  orderController.getDigitalDownloads
);

router.post('/digital/:downloadId/download',
  orderController.downloadDigitalProduct
);

// Seller order routes
router.use(authMiddleware.restrictTo('seller', 'admin', 'super-admin'));

router.get('/seller/orders',
  sellerMiddleware.canAccessSellerDashboard,
  orderController.getSellerOrders
);

router.put('/seller/:orderId/status',
  sellerMiddleware.canAccessSellerDashboard,
  orderController.updateOrderStatus
);

router.post('/seller/:orderId/ship',
  sellerMiddleware.canAccessSellerDashboard,
  orderController.shipOrder
);

router.get('/seller/analytics',
  sellerMiddleware.canAccessSellerDashboard,
  orderController.getSellerAnalytics
);

// Admin order routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/admin/all',
  orderController.getAllOrders
);

router.get('/admin/stats',
  orderController.getOrderStats
);

router.put('/admin/:orderId/status',
  orderController.adminUpdateOrderStatus
);

router.post('/admin/:orderId/refund',
  orderController.processRefund
);

router.get('/admin/returns',
  orderController.getReturnRequests
);

router.put('/admin/returns/:returnId',
  orderController.processReturnRequest
);

// Super admin routes
router.use(authMiddleware.restrictTo('super-admin'));

router.get('/super-admin/revenue',
  orderController.getSuperAdminRevenue
);

router.post('/super-admin/bulk-update',
  orderController.bulkUpdateOrders
);

module.exports = router;