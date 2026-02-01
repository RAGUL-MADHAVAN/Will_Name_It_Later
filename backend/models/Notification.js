const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  type: {
    type: String,
    enum: ['complaint', 'resource', 'system', 'reminder', 'warning', 'success'],
    required: true
  },
  category: {
    type: String,
    enum: ['new', 'update', 'resolved', 'borrowed', 'returned', 'overdue', 'maintenance', 'other']
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['complaint', 'resource', 'user']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  actionUrl: {
    type: String
  },
  actionText: {
    type: String,
    maxlength: [30, 'Action text cannot exceed 30 characters']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  expiresAt: {
    type: Date
  },
  isPush: {
    type: Boolean,
    default: false
  },
  isEmail: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for time since creation
notificationSchema.virtual('timeSinceCreated').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.readAt = null;
  return this.save();
};

// Check if notification is expired
notificationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  
  // Set expiration if not provided (default 30 days)
  if (!notification.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    notification.expiresAt = expiresAt;
  }
  
  return notification.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Indexes for better query performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index for automatic cleanup of expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
