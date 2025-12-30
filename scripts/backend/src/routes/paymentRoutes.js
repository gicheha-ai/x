// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes (for payment gateways webhooks)
router.post('/webhook/stripe',
  paymentController.stripeWebhook
);

router.post('/webhook/paypal',
  paymentController.paypalWebhook
);

router.post('/webhook/airtel',
  paymentController.airtelWebhook
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Payment methods
router.get('/methods',
  paymentController.getPaymentMethods
);

router.post('/methods',
  paymentController.addPaymentMethod
);

router.delete('/methods/:methodId',
  paymentController.removePaymentMethod
);

// Payment processing
router.post('/process',
  paymentController.processPayment
);

router.post('/deposit',
  paymentController.depositFunds
);

router.post('/withdraw',
  paymentController.withdrawFunds
);

// Payment history
router.get('/history',
  paymentController.getPaymentHistory
);

router.get('/:paymentId',
  paymentController.getPaymentDetails
);

// Refunds
router.post('/:paymentId/refund',
  paymentController.requestRefund
);

// Admin routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/admin/transactions',
  paymentController.getAllTransactions
);

router.get('/admin/stats',
  paymentController.getPaymentStats
);

router.post('/admin/refund/:paymentId',
  paymentController.adminProcessRefund
);

// Super admin routes
router.use(authMiddleware.restrictTo('super-admin'));

router.get('/super-admin/revenue',
  paymentController.getSuperAdminRevenue
);

router.post('/super-admin/payout',
  paymentController.processPayout
);

module.exports = router;