const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  validateComplaint,
  validateComplaintFeedback
} = require('../middleware/validation');
const {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
  addComplaintFeedback,
  upvoteComplaint,
  removeUpvote,
  getComplaintStats
} = require('../controllers/complaintController');

// All routes are protected
router.use(protect);

// Public routes for all authenticated users
router.post('/', validateComplaint, createComplaint);
router.get('/', getComplaints);
router.get('/stats', getComplaintStats);
router.get('/:id', getComplaint);
router.post('/:id/upvote', upvoteComplaint);
router.delete('/:id/upvote', removeUpvote);

// Routes for complaint feedback (only by complaint reporter)
router.post('/:id/feedback', validateComplaintFeedback, addComplaintFeedback);

// Routes for warden and admin only
router.put('/:id/status', authorize('warden', 'admin'), updateComplaintStatus);

module.exports = router;
