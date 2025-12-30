// backend/src/routes/linkRoutes.js
const express = require('express');
const router = express.Router();
const linkController = require('../controllers/linkController');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public tracking endpoint
router.get('/track/:linkId',
  linkController.trackLinkClick
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// User link management (for affiliates)
router.get('/my-links',
  linkController.getMyLinks
);

router.post('/generate',
  linkController.generateLink
);

router.get('/:linkId/stats',
  linkController.getLinkStats
);

// Admin routes (for campaign management)
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/campaigns',
  linkController.getCampaigns
);

router.post('/campaigns',
  linkController.createCampaign
);

router.put('/campaigns/:campaignId',
  linkController.updateCampaign
);

// Super admin exclusive routes (24-hour tracking links)
router.use(superAdminMiddleware.isSuperAdmin);

router.get('/super-admin/dashboard',
  linkController.getSuperAdminLinkDashboard
);

router.post('/super-admin/generate',
  linkController.generateSuperAdminLink
);

router.get('/super-admin/links',
  linkController.getSuperAdminLinks
);

router.get('/super-admin/links/:linkId',
  linkController.getSuperAdminLinkDetails
);

router.get('/super-admin/analytics',
  linkController.getSuperAdminLinkAnalytics
);

router.put('/super-admin/links/:linkId/extend',
  linkController.extendSuperAdminLink
);

router.delete('/super-admin/links/:linkId',
  linkController.deleteSuperAdminLink
);

// Link analytics exports
router.get('/super-admin/export/csv',
  linkController.exportLinksCSV
);

router.get('/super-admin/export/json',
  linkController.exportLinksJSON
);

// Link cleanup (automated)
router.post('/super-admin/cleanup',
  linkController.cleanupExpiredLinks
);

module.exports = router;