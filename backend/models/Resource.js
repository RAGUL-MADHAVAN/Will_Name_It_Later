const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Resource name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'books', 'sports', 'kitchen', 'tools', 'study-materials', 'other']
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    required: true
  },
  availability: {
    type: String,
    enum: ['available', 'requested', 'borrowed', 'maintenance', 'unavailable'],
    default: 'available'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentBorrower: {
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
  maxBorrowDuration: {
    type: Number,
    default: 7, // days
    min: 1,
    max: 30
  },
  depositRequired: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    min: 0
  },
  borrowingRules: {
    type: String,
    maxlength: [300, 'Borrowing rules cannot exceed 300 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  borrowHistory: [{
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    borrowedAt: {
      type: Date,
      default: Date.now
    },
    returnedAt: Date,
    dueDate: Date,
    status: {
      type: String,
      enum: ['active', 'returned', 'overdue'],
      default: 'active'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: [200, 'Feedback cannot exceed 200 characters']
    }
  }],
  totalBorrows: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  wishlist: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  borrowRequests: [{
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    decisionAt: { type: Date },
    message: { type: String, maxlength: 200 }
  }]
}, {
  timestamps: true
});

// Virtual for current borrowing status
resourceSchema.virtual('isCurrentlyBorrowed').get(function() {
  return this.availability === 'borrowed' && this.currentBorrower;
});

// Virtual for due date if borrowed
resourceSchema.virtual('currentDueDate').get(function() {
  if (!this.isCurrentlyBorrowed) return null;
  const activeBorrow = this.borrowHistory.find(borrow => borrow.status === 'active');
  return activeBorrow ? activeBorrow.dueDate : null;
});

// Virtual for days overdue
resourceSchema.virtual('daysOverdue').get(function() {
  if (!this.currentDueDate) return 0;
  const now = new Date();
  const diffTime = now - this.currentDueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Check if user has wishlisted this resource
resourceSchema.methods.isInWishlist = function(userId) {
  return this.wishlist.some(item => item.user.toString() === userId.toString());
};

// Add to wishlist
resourceSchema.methods.addToWishlist = function(userId) {
  if (!this.isInWishlist(userId)) {
    this.wishlist.push({ user: userId });
  }
  return this.save();
};

// Remove from wishlist
resourceSchema.methods.removeFromWishlist = function(userId) {
  this.wishlist = this.wishlist.filter(item => item.user.toString() !== userId.toString());
  return this.save();
};

// Borrow resource
resourceSchema.methods.borrow = function(userId, duration) {
  if (this.availability !== 'available') {
    throw new Error('Resource is not available for borrowing');
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (duration || this.maxBorrowDuration));

  this.availability = 'borrowed';
  this.currentBorrower = userId;
  this.totalBorrows += 1;
  this.borrowHistory.push({
    borrower: userId,
    borrowedAt: new Date(),
    dueDate: dueDate,
    status: 'active'
  });

  return this.save();
};

// Return resource
resourceSchema.methods.return = function(rating, feedback) {
  if (this.availability !== 'borrowed') {
    throw new Error('Resource is not currently borrowed');
  }

  const activeBorrow = this.borrowHistory.find(borrow => borrow.status === 'active');
  if (activeBorrow) {
    activeBorrow.returnedAt = new Date();
    activeBorrow.status = 'returned';
    if (rating) activeBorrow.rating = rating;
    if (feedback) activeBorrow.feedback = feedback;

    // Update average rating
    const returnedBorrows = this.borrowHistory.filter(b => b.status === 'returned' && b.rating);
    if (returnedBorrows.length > 0) {
      this.averageRating = returnedBorrows.reduce((sum, b) => sum + b.rating, 0) / returnedBorrows.length;
    }
  }

  this.availability = 'available';
  this.currentBorrower = null;

  return this.save();
};

// Increment view count
resourceSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Check if user is owner
resourceSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

// Indexes for better query performance
resourceSchema.index({ owner: 1, availability: 1 });
resourceSchema.index({ category: 1, availability: 1 });
resourceSchema.index({ hostelBlock: 1, roomNumber: 1 });
resourceSchema.index({ 'borrowHistory.borrower': 1, 'borrowHistory.status': 1 });
resourceSchema.index({ averageRating: -1 });
resourceSchema.index({ totalBorrows: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
