const Resource = require('../models/Resource');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create new resource
const createResource = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      condition,
      hostelBlock,
      roomNumber,
      maxBorrowDuration,
      depositRequired,
      depositAmount,
      borrowingRules,
      tags,
      isPublic
    } = req.body;

    const resolvedHostelBlock = hostelBlock || req.user.hostelBlock;
    const resolvedRoomNumber = roomNumber || req.user.roomNumber;

    if (!resolvedHostelBlock || !resolvedRoomNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Hostel block and room number are required to list a resource'
      });
    }

    // Prevent duplicate listings with same name by the same owner (case-insensitive)
    const existing = await Resource.findOne({
      owner: req.user.id,
      name: { $regex: `^${name}$`, $options: 'i' }
    });

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'You already listed a resource with this name'
      });
    }

    const resource = new Resource({
      name,
      description,
      category,
      condition,
      owner: req.user.id,
      hostelBlock: resolvedHostelBlock,
      roomNumber: resolvedRoomNumber,
      maxBorrowDuration: maxBorrowDuration || 7,
      depositRequired: depositRequired || false,
      depositAmount: depositAmount || 0,
      borrowingRules,
      tags: tags || [],
      isPublic: isPublic !== false
    });

    await resource.save();

    // Populate owner data for response
    await resource.populate('owner', 'name email hostelBlock roomNumber');

    // Update user's total lent count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalLent: 1 } });

    res.status(201).json({
      status: 'success',
      message: 'Resource created successfully',
      data: { resource }
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating resource'
    });
  }
};

// Get all resources (with filters)
const getResources = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      condition,
      availability,
      hostelBlock,
      roomNumber,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter
    const filter = { isPublic: true };
    
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (availability) filter.availability = availability;
    if (hostelBlock) filter.hostelBlock = hostelBlock;
    if (roomNumber) filter.roomNumber = roomNumber;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const resources = await Resource.find(filter)
      .populate('owner', 'name hostelBlock roomNumber')
      .populate('currentBorrower', 'name hostelBlock roomNumber')
      .populate('borrowRequests.requester', 'name hostelBlock roomNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        resources,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resources'
    });
  }
};

// Get single resource
const getResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('owner', 'name email hostelBlock roomNumber')
      .populate('currentBorrower', 'name hostelBlock roomNumber')
      .populate('borrowHistory.borrower', 'name hostelBlock roomNumber')
      .populate('borrowRequests.requester', 'name hostelBlock roomNumber');

    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Increment view count (only for non-owners)
    if (resource.owner._id.toString() !== req.user.id) {
      await resource.incrementViewCount();
    }

    res.status(200).json({
      status: 'success',
      data: { resource }
    });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resource'
    });
  }
};

// Update resource
const updateResource = async (req, res) => {
  try {
    const {
      name,
      description,
      condition,
      availability,
      maxBorrowDuration,
      depositRequired,
      depositAmount,
      borrowingRules,
      tags,
      isPublic
    } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Check if user is the owner
    if (resource.owner.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the resource owner can update this resource'
      });
    }

    // Update fields
    if (name) resource.name = name;
    if (description) resource.description = description;
    if (condition) resource.condition = condition;
    if (availability) resource.availability = availability;
    if (maxBorrowDuration) resource.maxBorrowDuration = maxBorrowDuration;
    if (depositRequired !== undefined) resource.depositRequired = depositRequired;
    if (depositAmount !== undefined) resource.depositAmount = depositAmount;
    if (borrowingRules) resource.borrowingRules = borrowingRules;
    if (tags) resource.tags = tags;
    if (isPublic !== undefined) resource.isPublic = isPublic;

    await resource.save();
    await resource.populate('owner', 'name hostelBlock roomNumber');

    res.status(200).json({
      status: 'success',
      message: 'Resource updated successfully',
      data: { resource }
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating resource'
    });
  }
};

// Delete resource
const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Check if user is the owner or admin
    if (resource.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only the resource owner or admin can delete this resource'
      });
    }

    // Check if resource is currently borrowed
    if (resource.availability === 'borrowed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete a resource that is currently borrowed'
      });
    }

    await Resource.findByIdAndDelete(req.params.id);

    // Update user's total lent count
    await User.findByIdAndUpdate(resource.owner, { $inc: { totalLent: -1 } });

    res.status(200).json({
      status: 'success',
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting resource'
    });
  }
};

// Borrow request: student requests, sets availability to requested
const requestBorrow = async (req, res) => {
  try {
    const { duration, message } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }

    if (resource.owner.toString() === req.user.id) {
      return res.status(400).json({ status: 'error', message: 'You cannot request your own resource' });
    }

    if (!['available', 'requested'].includes(resource.availability)) {
      return res.status(400).json({ status: 'error', message: 'Resource not available for requests' });
    }

    // Only one pending per requester per resource
    const hasPending = resource.borrowRequests.some(
      (r) => r.requester.toString() === req.user.id && r.status === 'pending'
    );
    if (hasPending) {
      return res.status(400).json({ status: 'error', message: 'You already have a pending request' });
    }

    resource.borrowRequests.push({ requester: req.user.id, message });
    resource.availability = 'requested';
    await resource.save();

    await Notification.createNotification({
      recipient: resource.owner,
      title: 'New borrow request',
      message: `${req.user.name} requested "${resource.name}"${message ? `: ${message}` : ''}`,
      type: 'resource',
      category: 'borrow-request',
      priority: 'medium',
      relatedEntity: { entityType: 'resource', entityId: resource._id },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'Review Request'
    });

    res.status(200).json({ status: 'success', message: 'Request submitted', data: { resource } });
  } catch (error) {
    console.error('Request borrow error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error while requesting borrow' });
  }
};

// Owner approves request -> sets borrowed
const approveBorrowRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { duration } = req.body;
    const resource = await Resource.findById(id);
    if (!resource) return res.status(404).json({ status: 'error', message: 'Resource not found' });
    if (resource.owner.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Only owner can approve' });
    }
    if (resource.availability === 'borrowed') {
      return res.status(400).json({ status: 'error', message: 'Resource already borrowed' });
    }

    const request = resource.borrowRequests.id(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: 'Request not pending' });
    }

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (duration || resource.maxBorrowDuration));

    // Atomic update
    request.status = 'approved';
    request.decisionAt = now;
    resource.availability = 'borrowed';
    resource.currentBorrower = request.requester;
    await resource.save();
    resource.totalBorrows += 1;
    resource.borrowHistory.push({
      borrower: request.requester,
      borrowedAt: now,
      dueDate,
      status: 'active'
    });
    // close other pending requests
    resource.borrowRequests.forEach((r) => {
      if (r._id.toString() !== requestId && r.status === 'pending') {
        r.status = 'rejected';
        r.decisionAt = now;
      }
    });

    await resource.save();

    await Notification.createNotification({
      recipient: request.requester,
      title: 'Borrow request approved',
      message: `Your request for "${resource.name}" was approved. Due date: ${dueDate.toLocaleDateString()}.`,
      type: 'resource',
      category: 'borrow-approval',
      priority: 'medium',
      relatedEntity: { entityType: 'resource', entityId: resource._id },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Resource'
    });

    res.status(200).json({ status: 'success', message: 'Request approved', data: { resource } });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error while approving request' });
  }
};

// Owner rejects request; availability returns to available if none pending
const rejectBorrowRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const resource = await Resource.findById(id);
    if (!resource) return res.status(404).json({ status: 'error', message: 'Resource not found' });
    if (resource.owner.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Only owner can reject' });
    }

    const request = resource.borrowRequests.id(requestId);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: 'Request not pending' });
    }

    // Atomic update
    request.status = 'rejected';
    request.decisionAt = new Date();
    const hasOtherPending = resource.borrowRequests.some((r) => r.status === 'pending');
    if (!hasOtherPending && resource.availability === 'requested') {
      resource.availability = 'available';
    }
    await resource.save();

    await Notification.createNotification({
      recipient: request.requester,
      title: 'Borrow request rejected',
      message: `Your request for "${resource.name}" was rejected.`,
      type: 'resource',
      category: 'borrow-rejection',
      priority: 'low',
      relatedEntity: { entityType: 'resource', entityId: resource._id },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Resource'
    });

    res.status(200).json({ status: 'success', message: 'Request rejected', data: { resource } });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error while rejecting request' });
  }
};

// Owner marks resource returned/available
const markResourceAvailable = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const resource = await Resource.findById(id);
    if (!resource) return res.status(404).json({ status: 'error', message: 'Resource not found' });
    if (resource.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Only owner or admin can mark available' });
    }

    // Close active borrow
    if (resource.currentBorrower) {
      const active = resource.borrowHistory.find((b) => b.status === 'active');
      if (active) {
        active.status = 'returned';
        active.returnedAt = new Date();
        if (rating) active.rating = rating;
        if (feedback) active.feedback = feedback;
      }
    }

    resource.currentBorrower = null;
    resource.availability = 'available';
    await resource.save();

    res.status(200).json({ status: 'success', message: 'Resource marked available', data: { resource } });
  } catch (error) {
    console.error('Mark available error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error while marking available' });
  }
};

// Borrower requests return (notify owner)
const returnRequest = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' });
    }

    if (resource.currentBorrower?.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Only current borrower can request return' });
    }

    // Notify owner
    await Notification.createNotification({
      recipient: resource.owner,
      title: 'Return request',
      message: `${req.user.name} has requested to return "${resource.name}". Please mark it available once received.`,
      type: 'resource',
      category: 'borrow-request',
      priority: 'medium',
      relatedEntity: { entityType: 'resource', entityId: resource._id },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'Mark Available'
    });

    res.status(200).json({ status: 'success', message: 'Return request sent' });
  } catch (error) {
    console.error('Return request error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error while requesting return' });
  }
};

// Add to wishlist
const addToWishlist = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    await resource.addToWishlist(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Added to wishlist successfully'
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while adding to wishlist'
    });
  }
};

// Remove from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    await resource.removeFromWishlist(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Removed from wishlist successfully'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while removing from wishlist'
    });
  }
};

// Get user's resources
const getUserResources = async (req, res) => {
  try {
    const { type = 'owned' } = req.query;
    
    let filter = {};
    if (type === 'owned') {
      filter.owner = req.user.id;
    } else if (type === 'borrowed') {
      filter.currentBorrower = req.user.id;
    } else if (type === 'wishlist') {
      filter['wishlist.user'] = req.user.id;
    }

    const resources = await Resource.find(filter)
      .populate('owner', 'name hostelBlock roomNumber')
      .populate('currentBorrower', 'name hostelBlock roomNumber')
      .populate('borrowRequests.requester', 'name hostelBlock roomNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { resources }
    });
  } catch (error) {
    console.error('Get user resources error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user resources'
    });
  }
};

// Get resource statistics
const getResourceStats = async (req, res) => {
  try {
    const { hostelBlock, timeRange = '30' } = req.query;
    
    // Calculate date range
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build filter
    const filter = { createdAt: { $gte: startDate } };
    if (hostelBlock) filter.hostelBlock = hostelBlock;

    // Get statistics
    const stats = await Promise.all([
      Resource.countDocuments({ ...filter, availability: 'available' }),
      Resource.countDocuments({ ...filter, availability: 'borrowed' }),
      Resource.countDocuments({ ...filter, availability: 'maintenance' }),
      Resource.countDocuments(filter)
    ]);

    const [available, borrowed, maintenance, total] = stats;

    // Get category breakdown
    const categoryStats = await Resource.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get most borrowed resources
    const mostBorrowed = await Resource.find(filter)
      .sort({ totalBorrows: -1 })
      .limit(5)
      .populate('owner', 'name')
      .select('name totalBorrows averageRating owner');

    // Get highest rated resources
    const highestRated = await Resource.find({
      ...filter,
      averageRating: { $gt: 0 }
    })
      .sort({ averageRating: -1 })
      .limit(5)
      .populate('owner', 'name')
      .select('name averageRating totalBorrows owner');

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          available,
          borrowed,
          maintenance,
          total,
          availabilityRate: total > 0 ? ((available / total) * 100).toFixed(1) : 0
        },
        categoryBreakdown: categoryStats,
        mostBorrowed,
        highestRated
      }
    });
  } catch (error) {
    console.error('Get resource stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resource stats'
    });
  }
};

// Block/Unblock a resource (warden/admin only)
const blockResource = async (req, res) => {
  try {
    const { action } = req.body // 'block' or 'unblock'
    const resource = await Resource.findById(req.params.id)

    if (!resource) {
      return res.status(404).json({ status: 'error', message: 'Resource not found' })
    }

    // Only wardens/admins can block/unblock
    if (!['warden', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Access denied' })
    }

    // Wardens can only block resources in their hostel
    if (req.user.role === 'warden' && resource.hostelBlock !== req.user.hostelBlock) {
      return res.status(403).json({ status: 'error', message: 'You can only block resources in your hostel' })
    }

    resource.availability = action === 'block' ? 'unavailable' : 'available'
    await resource.save()

    res.status(200).json({
      status: 'success',
      message: `Resource ${action}ed successfully`,
      data: { resource }
    })
  } catch (error) {
    console.error('Block resource error:', error)
    res.status(500).json({ status: 'error', message: 'Server error' })
  }
}

module.exports = {
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
blockResource,
getResourceStats
};
