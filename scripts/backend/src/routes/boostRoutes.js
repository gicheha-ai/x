// backend/src/routes/boostRoutes.js
const express = require('express');
const router = express.Router();
const boostController = require('../controllers/boostController');
const authMiddleware = require('../middleware/authMiddleware');
const sellerMiddleware = require('../middleware/sellerMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/plans',
  boostController.getBoostPlans
);

router.get('/active',
  boostController.getActiveBoosts
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Boost product routes
router.post('/product/:productId',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  sellerMiddleware.canBoostProducts,
  validationMiddleware.validateBoostRequest,
  boostController.boostProduct
);

router.get('/my-boosts',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  boostController.getMyBoosts
);

router.get('/product/:productId/status',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  boostController.getProductBoostStatus
);

router.put('/:boostId/cancel',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  boostController.cancelBoost
);

router.put('/:boostId/extend',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  validationMiddleware.validateBoostExtend,
  boostController.extendBoost
);

// Boost analytics routes
router.get('/analytics',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  boostController.getBoostAnalytics
);

router.get('/:boostId/analytics',
  authMiddleware.restrictTo('seller', 'admin', 'super-admin'),
  boostController.getBoostDetailAnalytics
);

// Admin routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/all',
  boostController.getAllBoosts
);

router.get('/stats',
  boostController.getBoostStats
);

router.post('/process-renewals',
  boostController.processAutoRenewals
);

// Super admin routes
router.use(authMiddleware.restrictTo('super-admin'));

router.post('/super-admin/boost',
  validationMiddleware.validateSuperAdminBoost,
  boostController.superAdminBoostProduct
);

module.exports = router;