// backend/src/routes/affiliateRoutes.js
const express = require('express');
const router = express.Router();
const affiliateController = require('../controllers/affiliateController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/leaderboard',
  affiliateController.getAffiliateLeaderboard
);

router.get('/track/:affiliateCode/:token',
  affiliateController.trackAffiliateClick
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Affiliate registration and management
router.post('/register',
  validationMiddleware.validateAffiliateRegistration,
  affiliateController.registerAffiliate
);

router.get('/dashboard',
  affiliateController.getAffiliateDashboard
);

router.get('/commission-report',
  affiliateController.getCommissionReport
);

router.get('/marketing-materials',
  affiliateController.getMarketingMaterials
);

// Affiliate link generation
router.post('/generate-link',
  validationMiddleware.validateAffiliateLink,
  affiliateController.generateAffiliateLink
);

// Withdrawal requests
router.post('/withdraw',
  validationMiddleware.validateWithdrawalRequest,
  affiliateController.requestWithdrawal
);

// Admin routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/admin/all',
  affiliateController.getAllAffiliates
);

router.get('/admin/stats',
  affiliateController.getAffiliateStats
);

router.put('/admin/:affiliateId/approve',
  affiliateController.approveAffiliate
);

router.put('/admin/:affiliateId/suspend',
  affiliateController.suspendAffiliate
);

router.post('/admin/withdrawals/process',
  affiliateController.processWithdrawal
);

// Super admin routes
router.use(authMiddleware.restrictTo('super-admin'));

router.get('/super-admin/analytics',
  affiliateController.getSuperAdminAffiliateAnalytics
);

router.post('/super-admin/payout',
  affiliateController.superAdminPayout
);

module.exports = router;