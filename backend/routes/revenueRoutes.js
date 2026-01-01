// backend/src/routes/revenueRoutes.js
const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// All routes require super admin access
router.use(authMiddleware.protect);
router.use(superAdminMiddleware.isSuperAdmin);

// Revenue dashboard
router.get('/dashboard',
  revenueController.getRevenueDashboard
);

router.get('/summary',
  revenueController.getRevenueSummary
);

// Revenue analytics
router.get('/analytics',
  revenueController.getRevenueAnalytics
);

router.get('/breakdown',
  revenueController.getRevenueBreakdown
);

// Time-based reports
router.get('/daily',
  revenueController.getDailyRevenue
);

router.get('/weekly',
  revenueController.getWeeklyRevenue
);

router.get('/monthly',
  revenueController.getMonthlyRevenue
);

router.get('/yearly',
  revenueController.getYearlyRevenue
);

// Source-based reports
router.get('/by-source',
  revenueController.getRevenueBySource
);

router.get('/by-type',
  revenueController.getRevenueByType
);

router.get('/by-payment-method',
  revenueController.getRevenueByPaymentMethod
);

// Top performers
router.get('/top-products',
  revenueController.getTopProductsRevenue
);

router.get('/top-sellers',
  revenueController.getTopSellersRevenue
);

router.get('/top-affiliates',
  revenueController.getTopAffiliatesRevenue
);

// Detailed reports
router.get('/transactions',
  validationMiddleware.validatePagination,
  revenueController.getAllTransactions
);

router.get('/transactions/export',
  revenueController.exportTransactions
);

// Revenue tracking
router.get('/tracking/:linkId',
  revenueController.getTrackingLinkRevenue
);

// Revenue reconciliation
router.get('/reconciliation',
  revenueController.getReconciliationReport
);

router.post('/reconcile',
  revenueController.reconcileRevenue
);

// Revenue settings
router.get('/settings',
  revenueController.getRevenueSettings
);

router.put('/settings',
  revenueController.updateRevenueSettings
);

// Manual revenue entry (for corrections)
router.post('/manual-entry',
  revenueController.manualRevenueEntry
);

// Revenue alerts
router.get('/alerts',
  revenueController.getRevenueAlerts
);

router.post('/alerts/setup',
  revenueController.setupRevenueAlerts
);

module.exports = router;