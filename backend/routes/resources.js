const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  validateResource,
  validateBorrowRequest,
  validateBorrowDecision
} = require('../middleware/validation');
const {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  requestBorrow,
  approveBorrowRequest,
  rejectBorrowRequest,
  markResourceAvailable,
  returnRequest,
  addToWishlist,
  removeFromWishlist,
  getUserResources,
  getResourceStats,
  blockResource
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

// Resource borrowing (approval-based)
router.post('/:id/requests', validateBorrowRequest, requestBorrow);
router.post('/:id/requests/:requestId/approve', validateBorrowDecision, approveBorrowRequest);
router.post('/:id/requests/:requestId/reject', validateBorrowDecision, rejectBorrowRequest);
router.post('/:id/return-request', returnRequest);
router.post('/:id/mark-available', markResourceAvailable);

// Resource management (only owners can update/delete)
router.post('/', validateResource, createResource);
router.put('/:id', validateResource, updateResource);
router.delete('/:id', deleteResource);

// Warden/admin resource blocking
router.post('/:id/block', blockResource);

module.exports = router;
