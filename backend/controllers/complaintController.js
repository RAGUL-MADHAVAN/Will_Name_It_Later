const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create new complaint
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, hostelBlock, roomNumber, isAnonymous, tags } = req.body;

    const complaint = new Complaint({
      title,
      description,
      category,
      priority: priority || 'medium',
      reportedBy: req.user.id,
      hostelBlock,
      roomNumber,
      isAnonymous: isAnonymous || false,
      tags: tags || []
    });

    await complaint.save();

    // Populate user data for response
    await complaint.populate('reportedBy', 'name email role hostelBlock roomNumber');

    // Notify wardens and admins about new complaint
    const wardensAndAdmins = await User.find({
      role: { $in: ['warden', 'admin'] },
      isActive: true
    });

    const notificationPromises = wardensAndAdmins.map(user => 
      Notification.createNotification({
        recipient: user._id,
        title: 'New Complaint Filed',
        message: `A new complaint "${title}" has been filed in ${hostelBlock} Block.`,
        type: 'complaint',
        category: 'new',
        priority: priority === 'urgent' ? 'high' : 'medium',
        relatedEntity: {
          entityType: 'complaint',
          entityId: complaint._id
        },
        actionUrl: `/complaints/${complaint._id}`,
        actionText: 'View Complaint'
      })
    );

    await Promise.all(notificationPromises);

    res.status(201).json({
      status: 'success',
      message: 'Complaint created successfully',
      data: { complaint }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating complaint'
    });
  }
};

// Get all complaints (with filters)
const getComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      hostelBlock,
      roomNumber,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (hostelBlock) filter.hostelBlock = hostelBlock;
    if (roomNumber) filter.roomNumber = roomNumber;

    // If user is student, only show their own complaints unless not anonymous
    if (req.user.role === 'student') {
      filter.$or = [
        { reportedBy: req.user.id },
        { isAnonymous: false }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const complaints = await Complaint.find(filter)
      .populate('reportedBy', 'name email role hostelBlock roomNumber')
      .populate('assignedTo', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        complaints,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching complaints'
    });
  }
};

// Get single complaint
const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('reportedBy', 'name email role hostelBlock roomNumber')
      .populate('assignedTo', 'name email role');

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user has access to this complaint
    if (req.user.role === 'student' && 
        complaint.reportedBy._id.toString() !== req.user.id && 
        !complaint.isAnonymous) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied to this complaint'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { complaint }
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching complaint'
    });
  }
};

// Update complaint status
const updateComplaintStatus = async (req, res) => {
  try {
    const { status, assignedTo, resolutionNotes, estimatedResolutionTime } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Update fields
    if (status) {
      complaint.status = status;
      
      // Set actual resolution time when resolved
      if (status === 'resolved') {
        complaint.actualResolutionTime = new Date();
      }
    }
    
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (estimatedResolutionTime) complaint.estimatedResolutionTime = new Date(estimatedResolutionTime);

    await complaint.save();
    await complaint.populate('assignedTo', 'name email role');

    // Notify the complaint reporter about status change
    if (complaint.reportedBy.toString() !== req.user.id) {
      await Notification.createNotification({
        recipient: complaint.reportedBy,
        title: `Complaint Status Updated`,
        message: `Your complaint "${complaint.title}" status has been updated to ${status}.`,
        type: 'complaint',
        category: 'update',
        priority: 'medium',
        relatedEntity: {
          entityType: 'complaint',
          entityId: complaint._id
        },
        actionUrl: `/complaints/${complaint._id}`,
        actionText: 'View Details'
      });
    }

    // Notify assigned warden if assigned
    if (assignedTo && assignedTo !== req.user.id) {
      await Notification.createNotification({
        recipient: assignedTo,
        title: 'New Complaint Assigned',
        message: `You have been assigned to resolve complaint: "${complaint.title}"`,
        type: 'complaint',
        category: 'update',
        priority: complaint.priority === 'urgent' ? 'high' : 'medium',
        relatedEntity: {
          entityType: 'complaint',
          entityId: complaint._id
        },
        actionUrl: `/complaints/${complaint._id}`,
        actionText: 'View Complaint'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Complaint updated successfully',
      data: { complaint }
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating complaint'
    });
  }
};

// Add feedback to resolved complaint
const addComplaintFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user is the complaint reporter
    if (complaint.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the complaint reporter can add feedback'
      });
    }

    // Check if complaint is resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback can only be added to resolved complaints'
      });
    }

    complaint.feedback = { rating, comment };
    await complaint.save();

    res.status(200).json({
      status: 'success',
      message: 'Feedback added successfully',
      data: { complaint }
    });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while adding feedback'
    });
  }
};

// Upvote complaint
const upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user has already upvoted
    if (complaint.hasUserUpvoted(req.user.id)) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already upvoted this complaint'
      });
    }

    await complaint.addUpvote(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Complaint upvoted successfully',
      data: {
        upvoteCount: complaint.upvoteCount
      }
    });
  } catch (error) {
    console.error('Upvote complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while upvoting complaint'
    });
  }
};

// Remove upvote from complaint
const removeUpvote = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    // Check if user has upvoted
    if (!complaint.hasUserUpvoted(req.user.id)) {
      return res.status(400).json({
        status: 'error',
        message: 'You have not upvoted this complaint'
      });
    }

    await complaint.removeUpvote(req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Upvote removed successfully',
      data: {
        upvoteCount: complaint.upvoteCount
      }
    });
  } catch (error) {
    console.error('Remove upvote error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while removing upvote'
    });
  }
};

// Get complaint statistics
const getComplaintStats = async (req, res) => {
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
      Complaint.countDocuments({ ...filter, status: 'pending' }),
      Complaint.countDocuments({ ...filter, status: 'in-progress' }),
      Complaint.countDocuments({ ...filter, status: 'resolved' }),
      Complaint.countDocuments({ ...filter, status: 'rejected' }),
      Complaint.countDocuments({ ...filter, priority: 'urgent' }),
      Complaint.countDocuments(filter)
    ]);

    const [pending, inProgress, resolved, rejected, urgent, total] = stats;

    // Get category breakdown
    const categoryStats = await Complaint.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get resolution trend (last 7 days)
    const resolutionTrend = await Complaint.aggregate([
      { 
        $match: { 
          ...filter,
          status: 'resolved',
          actualResolutionTime: { $exists: true }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$actualResolutionTime' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 7 }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          pending,
          inProgress,
          resolved,
          rejected,
          urgent,
          total,
          resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0
        },
        categoryBreakdown: categoryStats,
        resolutionTrend
      }
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching complaint statistics'
    });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
  addComplaintFeedback,
  upvoteComplaint,
  removeUpvote,
  getComplaintStats
};
