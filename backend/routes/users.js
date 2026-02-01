const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  getUserDashboard,
  getAdminDashboard
} = require('../controllers/userController');

// All routes are protected
router.use(protect);

// Dashboard routes
router.get('/dashboard', getUserDashboard);
router.get('/admin-dashboard', authorize('admin', 'warden'), getAdminDashboard);

// Statistics
router.get('/stats', authorize('admin', 'warden'), getUserStats);

// User management (admin only for most operations)
router.get('/', authorize('admin', 'warden'), getUsers);
router.get('/:id', getUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
