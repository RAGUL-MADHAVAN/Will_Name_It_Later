const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  validateResource,
  validateResourceBorrow,
  validateResourceReturn
} = require('../middleware/validation');
const {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  borrowResource,
  returnResource,
  addToWishlist,
  removeFromWishlist,
  getUserResources,
  getResourceStats
} = require('../controllers/resourceController');

// All routes are protected
router.use(protect);

// Public routes for all authenticated users
router.get('/', getResources);
router.get('/stats', getResourceStats);
router.get('/my', getUserResources);
router.get('/:id', getResource);
router.post('/:id/wishlist', addToWishlist);
router.delete('/:id/wishlist', removeFromWishlist);

// Resource borrowing
router.post('/:id/borrow', validateResourceBorrow, borrowResource);
router.post('/:id/return', validateResourceReturn, returnResource);

// Resource management (only owners can update/delete)
router.post('/', validateResource, createResource);
router.put('/:id', validateResource, updateResource);
router.delete('/:id', deleteResource);

module.exports = router;
