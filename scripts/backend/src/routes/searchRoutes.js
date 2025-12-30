// backend/src/routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const validationMiddleware = require('../middleware/validationMiddleware');

// All routes are public
router.get('/',
  validationMiddleware.validatePagination,
  searchController.searchAll
);

router.get('/suggestions',
  searchController.getSearchSuggestions
);

router.get('/filters',
  searchController.getSearchFilters
);

router.get('/trending',
  searchController.getTrendingSearches
);

router.post('/analytics',
  searchController.recordSearch
);

module.exports = router;