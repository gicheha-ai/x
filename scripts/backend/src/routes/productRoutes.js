// backend/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const sellerMiddleware = require('../middleware/sellerMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

// Public routes
router.get('/',
  validationMiddleware.validatePagination,
  productController.getAllProducts
);

router.get('/trending',
  productController.getTrendingProducts
);

router.get('/featured',
  productController.getFeaturedProducts
);

router.get('/new-arrivals',
  productController.getNewArrivals
);

router.get('/search',
  productController.searchProducts
);

router.get('/:slug',
  productController.getProductBySlug
);

router.get('/:id/similar',
  validationMiddleware.validateObjectId('id'),
  productController.getSimilarProducts
);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Product reviews
router.get('/:id/reviews',
  validationMiddleware.validateObjectId('id'),
  productController.getProductReviews
);

router.post('/:id/reviews',
  validationMiddleware.validateObjectId('id'),
  productController.createReview
);

router.put('/reviews/:reviewId',
  productController.updateReview
);

router.delete('/reviews/:reviewId',
  productController.deleteReview
);

router.post('/reviews/:reviewId/helpful',
  productController.markReviewHelpful
);

router.post('/reviews/:reviewId/unhelpful',
  productController.markReviewUnhelpful
);

// Wishlist
router.get('/wishlist/items',
  productController.getWishlist
);

router.post('/wishlist/:productId',
  validationMiddleware.validateObjectId('productId'),
  productController.addToWishlist
);

router.delete('/wishlist/:productId',
  validationMiddleware.validateObjectId('productId'),
  productController.removeFromWishlist
);

// Seller routes
router.use(authMiddleware.restrictTo('seller', 'admin', 'super-admin'));

router.get('/seller/products',
  sellerMiddleware.canManageProducts,
  productController.getSellerProducts
);

router.post('/',
  sellerMiddleware.canManageProducts,
  productController.createProduct
);

router.put('/:id',
  sellerMiddleware.canManageProduct,
  productController.updateProduct
);

router.put('/:id/status',
  sellerMiddleware.canManageProduct,
  productController.updateProductStatus
);

router.delete('/:id',
  sellerMiddleware.canManageProduct,
  productController.deleteProduct
);

// Product variants
router.post('/:id/variants',
  sellerMiddleware.canManageProduct,
  productController.addVariant
);

router.put('/variants/:variantId',
  productController.updateVariant
);

router.delete('/variants/:variantId',
  productController.deleteVariant
);

// Inventory management
router.put('/:id/inventory',
  sellerMiddleware.canManageProduct,
  productController.updateInventory
);

router.get('/:id/inventory-history',
  sellerMiddleware.canManageProduct,
  productController.getInventoryHistory
);

// Admin routes
router.use(authMiddleware.restrictTo('admin', 'super-admin'));

router.get('/admin/all',
  productController.getAllProductsAdmin
);

router.put('/admin/:id/feature',
  productController.toggleFeatured
);

router.put('/admin/:id/boost',
  productController.manualBoost
);

// Super admin special routes
router.use(authMiddleware.restrictTo('super-admin'));

router.post('/super-admin/upload',
  productController.superAdminUpload
);

router.get('/super-admin/analytics',
  productController.getSuperAdminAnalytics
);

module.exports = router;