const mongoose = require('mongoose');

const resourceRequestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Request title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Request description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'books', 'sports', 'kitchen', 'tools', 'study-materials', 'other']
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
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fulfilledResource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  },
  fulfilledAt: {
    type: Date
  }
}, {
  timestamps: true
});

resourceRequestSchema.index({ status: 1, createdAt: -1 });
resourceRequestSchema.index({ category: 1, status: 1, createdAt: -1 });
resourceRequestSchema.index({ requestedBy: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ResourceRequest', resourceRequestSchema);
