const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Complaint description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electrical', 'plumbing', 'furniture', 'cleanliness', 'noise', 'security', 'other']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'awaiting-approval', 'resolved', 'rejected'],
    default: 'pending'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hostelBlock: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  roomNumber: {
    type: String,
    required: true,
    match: [/^[A-Z]\d{3}$/, 'Room number must be in format like A101']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v) || /^\/uploads\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  estimatedResolutionTime: {
    type: Date
  },
  actualResolutionTime: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    maxlength: [500, 'Resolution notes cannot exceed 500 characters']
  },
  feedback: {
    resolved: {
      type: Boolean
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [300, 'Feedback comment cannot exceed 300 characters']
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  upvotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  upvoteCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for time since creation
complaintSchema.virtual('timeSinceCreated').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Virtual for resolution time
complaintSchema.virtual('resolutionDuration').get(function() {
  if (!this.actualResolutionTime || !this.createdAt) return null;
  const diff = this.actualResolutionTime - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''}`;
});

// Update upvote count
complaintSchema.methods.updateUpvoteCount = function() {
  this.upvoteCount = this.upvotes.length;
  return this.save();
};

// Check if user has upvoted
complaintSchema.methods.hasUserUpvoted = function(userId) {
  return this.upvotes.some(upvote => upvote.user.toString() === userId.toString());
};

// Add upvote
complaintSchema.methods.addUpvote = function(userId) {
  if (!this.hasUserUpvoted(userId)) {
    this.upvotes.push({ user: userId });
    this.upvoteCount = this.upvotes.length;
  }
  return this.save();
};

// Remove upvote
complaintSchema.methods.removeUpvote = function(userId) {
  this.upvotes = this.upvotes.filter(upvote => upvote.user.toString() !== userId.toString());
  this.upvoteCount = this.upvotes.length;
  return this.save();
};

// Indexes for better query performance
complaintSchema.index({ reportedBy: 1, status: 1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ hostelBlock: 1, roomNumber: 1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
