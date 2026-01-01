// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.post('/register',
  validationMiddleware.validateUserRegistration,
  authController.register
);

router.post('/login',
  validationMiddleware.validateUserLogin,
  authController.login
);

router.post('/refresh-token',
  authController.refreshToken
);

router.post('/forgot-password',
  validationMiddleware.validatePasswordReset,
  authController.forgotPassword
);

router.post('/reset-password/:token',
  validationMiddleware.validatePasswordUpdate,
  authController.resetPassword
);

router.post('/verify-email/:token',
  authController.verifyEmail
);

router.post('/resend-verification',
  authController.resendVerification
);

// Social authentication
router.post('/social/google',
  authController.googleAuth
);

router.post('/social/facebook',
  authController.facebookAuth
);

// Protected routes (require authentication)
router.use(require('../middleware/authMiddleware').protect);

router.post('/logout',
  authController.logout
);

router.post('/change-password',
  validationMiddleware.validatePasswordUpdate,
  authController.changePassword
);

router.post('/enable-2fa',
  authController.enableTwoFactor
);

router.post('/verify-2fa',
  authController.verifyTwoFactor
);

router.post('/disable-2fa',
  authController.disableTwoFactor
);

router.get('/sessions',
  authController.getActiveSessions
);

router.delete('/sessions/:sessionId',
  authController.revokeSession
);

module.exports = router;