const mongoose = require('mongoose');

const resourceRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
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
    enum: ['electronics', 'books', 'sports', 'kitchen', 'tools', 'study-materials', 'other'],
    lowercase: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'fulfilled', 'cancelled'],
    default: 'open'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
resourceRequestSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });
resourceRequestSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('ResourceRequest', resourceRequestSchema);
