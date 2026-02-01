const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  broadcastNotification
} = require('../controllers/notificationController');

// All routes are protected
router.use(protect);

// Public routes for all authenticated users
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/:id/unread', markAsUnread);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/read', deleteReadNotifications);

// Admin/warden only routes
router.post('/', authorize('admin', 'warden'), createNotification);
router.post('/broadcast', authorize('admin', 'warden'), broadcastNotification);

module.exports = router;
