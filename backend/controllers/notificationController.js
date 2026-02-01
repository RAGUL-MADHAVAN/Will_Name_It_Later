const Notification = require('../models/Notification');

// Get user notifications
const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { recipient: req.user.id };
    
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    // Exclude expired notifications
    filter.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(filter)
      .populate('sender', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching notifications'
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching unread count'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this notification'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while marking notification as read'
    });
  }
};

// Mark notification as unread
const markAsUnread = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this notification'
      });
    }

    await notification.markAsUnread();

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as unread',
      data: { notification }
    });
  } catch (error) {
    console.error('Mark as unread error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while marking notification as unread'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while marking all notifications as read'
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    // Check if user owns this notification
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this notification'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting notification'
    });
  }
};

// Delete all read notifications
const deleteReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} read notifications deleted successfully`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting read notifications'
    });
  }
};

// Create notification (admin/warden only)
const createNotification = async (req, res) => {
  try {
    const {
      recipient,
      title,
      message,
      type,
      category,
      priority,
      actionUrl,
      actionText,
      metadata
    } = req.body;

    // Validate recipient exists and is accessible
    if (req.user.role !== 'admin' && req.user.role !== 'warden') {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins and wardens can create notifications'
      });
    }

    const notification = await Notification.createNotification({
      recipient,
      sender: req.user.id,
      title,
      message,
      type,
      category,
      priority: priority || 'medium',
      actionUrl,
      actionText,
      metadata
    });

    await notification.populate('sender', 'name');

    res.status(201).json({
      status: 'success',
      message: 'Notification created successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating notification'
    });
  }
};

// Broadcast notification to multiple users (admin/warden only)
const broadcastNotification = async (req, res) => {
  try {
    const {
      recipients,
      title,
      message,
      type,
      category,
      priority,
      actionUrl,
      actionText,
      metadata
    } = req.body;

    // Validate permissions
    if (req.user.role !== 'admin' && req.user.role !== 'warden') {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins and wardens can broadcast notifications'
      });
    }

    const notificationPromises = recipients.map(recipientId =>
      Notification.createNotification({
        recipient: recipientId,
        sender: req.user.id,
        title,
        message,
        type,
        category,
        priority: priority || 'medium',
        actionUrl,
        actionText,
        metadata
      })
    );

    const notifications = await Promise.all(notificationPromises);

    res.status(201).json({
      status: 'success',
      message: `Notification broadcasted to ${recipients.length} users successfully`,
      data: { 
        sentCount: notifications.length,
        notifications: notifications.slice(0, 5) // Return first 5 for preview
      }
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while broadcasting notification'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createNotification,
  broadcastNotification
};
