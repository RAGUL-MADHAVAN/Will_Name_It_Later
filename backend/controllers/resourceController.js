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

    const resource = new Resource({
      name,
      description,
      category,
      condition,
      owner: req.user.id,
      hostelBlock,
      roomNumber,
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
      .populate('borrowHistory.borrower', 'name hostelBlock roomNumber');

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

// Borrow resource
const borrowResource = async (req, res) => {
  try {
    const { duration } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Check if resource is available
    if (resource.availability !== 'available') {
      return res.status(400).json({
        status: 'error',
        message: 'Resource is not available for borrowing'
      });
    }

    // Check if user is trying to borrow their own resource
    if (resource.owner.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot borrow your own resource'
      });
    }

    await resource.borrow(req.user.id, duration);

    // Update user's total borrowed count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalBorrowed: 1 } });

    // Notify resource owner
    await Notification.createNotification({
      recipient: resource.owner,
      title: 'Resource Borrowed',
      message: `Your resource "${resource.name}" has been borrowed by ${req.user.name}.`,
      type: 'resource',
      category: 'borrowed',
      priority: 'medium',
      relatedEntity: {
        entityType: 'resource',
        entityId: resource._id
      },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Resource'
    });

    // Send confirmation to borrower
    await Notification.createNotification({
      recipient: req.user.id,
      title: 'Resource Borrowed Successfully',
      message: `You have successfully borrowed "${resource.name}". Due date: ${resource.currentDueDate.toLocaleDateString()}.`,
      type: 'resource',
      category: 'borrowed',
      priority: 'medium',
      relatedEntity: {
        entityType: 'resource',
        entityId: resource._id
      },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Details'
    });

    res.status(200).json({
      status: 'success',
      message: 'Resource borrowed successfully',
      data: { resource }
    });
  } catch (error) {
    console.error('Borrow resource error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while borrowing resource'
    });
  }
};

// Return resource
const returnResource = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found'
      });
    }

    // Check if user is the current borrower
    if (!resource.currentBorrower || resource.currentBorrower.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not the current borrower of this resource'
      });
    }

    await resource.return(rating, feedback);

    // Notify resource owner
    await Notification.createNotification({
      recipient: resource.owner,
      title: 'Resource Returned',
      message: `Your resource "${resource.name}" has been returned by ${req.user.name}.`,
      type: 'resource',
      category: 'returned',
      priority: 'medium',
      relatedEntity: {
        entityType: 'resource',
        entityId: resource._id
      },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Resource'
    });

    res.status(200).json({
      status: 'success',
      message: 'Resource returned successfully',
      data: { resource }
    });
  } catch (error) {
    console.error('Return resource error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while returning resource'
    });
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
      message: 'Server error while fetching resource statistics'
    });
  }
};

module.exports = {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  borrowResource,
  returnResource,
  addToWishlist,
  removeFromWishlist,
  getUserResources,
  getResourceStats
};
