// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/:id/public',
  validationMiddleware.validateObjectId('id'),
  userController.getPublicProfile
);

router.get('/store/:slug',
  userController.getStoreBySlug
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// User profile
router.get('/profile',
  userController.getProfile
);

router.put('/profile',
  validationMiddleware.validateProfileUpdate,
  userController.updateProfile
);

router.put('/profile/avatar',
  userController.updateAvatar
);

// Address management
router.get('/addresses',
  userController.getAddresses
);

router.post('/addresses',
  userController.addAddress
);

router.put('/addresses/:addressId',
  userController.updateAddress
);

router.delete('/addresses/:addressId',
  userController.deleteAddress
);

router.put('/addresses/:addressId/default',
  userController.setDefaultAddress
);

// Wallet management
router.get('/wallet',
  userController.getWallet
);

router.post('/wallet/deposit',
  userController.depositToWallet
);

router.post('/wallet/withdraw',
  userController.withdrawFromWallet
);

router.get('/wallet/transactions',
  userController.getWalletTransactions
);

// Preferences
router.get('/preferences',
  userController.getPreferences
);

router.put('/preferences',
  userController.updatePreferences
);

// Admin routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/',
  validationMiddleware.validatePagination,
  userController.getAllUsers
);

router.get('/stats',
  userController.getUserStats
);

router.put('/:id/role',
  validationMiddleware.validateObjectId('id'),
  userController.updateUserRole
);

router.put('/:id/status',
  validationMiddleware.validateObjectId('id'),
  userController.updateUserStatus
);

router.delete('/:id',
  validationMiddleware.validateObjectId('id'),
  userController.deleteUser
);

// Super admin only routes
router.use(authMiddleware.restrictTo('super-admin'));

router.post('/create-admin',
  userController.createAdminUser
);

router.get('/super-admin/dashboard',
  userController.getSuperAdminDashboard
);

module.exports = router;