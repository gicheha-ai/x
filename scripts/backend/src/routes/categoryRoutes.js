// backend/src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/',
  categoryController.getAllCategories
);

router.get('/featured',
  categoryController.getFeaturedCategories
);

router.get('/hierarchy',
  categoryController.getCategoryHierarchy
);

router.get('/search',
  categoryController.searchCategories
);

router.get('/:slug',
  categoryController.getCategoryBySlug
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Admin routes (require admin or super admin role)
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.post('/',
  validationMiddleware.validateCategory,
  categoryController.createCategory
);

router.put('/:id',
  validationMiddleware.validateCategoryUpdate,
  categoryController.updateCategory
);

router.delete('/:id',
  categoryController.deleteCategory
);

// Super admin only routes
router.use(superAdminMiddleware.isSuperAdmin);

router.get('/stats',
  categoryController.getCategoryStats
);

router.put('/bulk-order',
  validationMiddleware.validateBulkOrder,
  categoryController.bulkUpdateOrder
);

module.exports = router;