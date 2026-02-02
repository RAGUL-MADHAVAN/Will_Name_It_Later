const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');

const computePriority = (category, createdAt, status = 'pending') => {
  const baseMap = {
    electrical: 'high',
    plumbing: 'high',
    security: 'high',
    cleanliness: 'medium',
    noise: 'medium',
    furniture: 'medium',
    other: 'medium'
  };

  let priority = baseMap[category] || 'medium';
  const ageHours = createdAt ? (Date.now() - new Date(createdAt)) / (1000 * 60 * 60) : 0;

  if (status !== 'resolved') {
    if (ageHours > 72) priority = 'urgent';
    else if (ageHours > 48 && priority === 'medium') priority = 'high';
  }

  return priority;
};

const formatComplaintForUser = (complaint, userId) => {
  const obj = complaint.toObject();
  const isOwner = obj.reportedBy && obj.reportedBy._id?.toString() === userId;
  const maskedReporter = obj.isAnonymous && !isOwner
    ? { _id: null, name: 'Anonymous' }
    : obj.reportedBy;

  return {
    ...obj,
    reportedBy: maskedReporter,
    displayReporter: obj.isAnonymous ? (isOwner ? 'You (anonymous)' : 'Anonymous') : (obj.reportedBy?.name || 'Unknown'),
    priority: computePriority(obj.category, obj.createdAt, obj.status),
    isOwner
  };
};

// Create new complaint
const createComplaint = async (req, res) => {
  try {
    const { title, description, category, hostelBlock, roomNumber, isAnonymous, tags } = req.body;

    // Prevent accidental duplicates within 12 hours by same user
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const duplicate = await Complaint.findOne({
      reportedBy: req.user.id,
      title: { $regex: `^${title}$`, $options: 'i' },
      description: { $regex: `^${description}$`, $options: 'i' },
      createdAt: { $gte: twelveHoursAgo }
    });

    if (duplicate) {
      return res.status(400).json({
        status: 'error',
        message: 'A similar complaint was filed recently. Please wait before submitting again.'
      });
    }

    const complaint = new Complaint({
      title,
      description,
      category,
      priority: computePriority(category, Date.now()),
      reportedBy: req.user.id,
      hostelBlock,
      roomNumber,
      isAnonymous: isAnonymous || false,
      tags: tags || []
    });

    await complaint.save();

    await complaint.populate('reportedBy', 'name email role hostelBlock roomNumber');

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
        priority: complaint.priority === 'urgent' ? 'high' : complaint.priority,
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
      data: { complaint: formatComplaintForUser(complaint, req.user.id) }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating complaint'
    });
  }
};

// Update complaint (owner only, before resolution)
const updateComplaint = async (req, res) => {
  try {
    const { title, description, category, isAnonymous } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found'
      });
    }

    if (complaint.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the reporter can edit this complaint'
      });
    }

    if (complaint.status === 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'Resolved complaints cannot be edited'
      });
    }

    if (title !== undefined) {
      if (title.trim().length < 5 || title.trim().length > 100) {
        return res.status(400).json({ status: 'error', message: 'Title must be between 5 and 100 characters' });
      }
      complaint.title = title;
    }

    if (description !== undefined) {
      if (description.trim().length < 10 || description.trim().length > 1000) {
        return res.status(400).json({ status: 'error', message: 'Description must be between 10 and 1000 characters' });
      }
      complaint.description = description;
    }

    if (category) complaint.category = category;
    if (typeof isAnonymous === 'boolean') complaint.isAnonymous = isAnonymous;

    complaint.priority = computePriority(complaint.category, complaint.createdAt, complaint.status);

    await complaint.save();
    await complaint.populate('reportedBy', 'name email role hostelBlock roomNumber');

    res.status(200).json({
      status: 'success',
      message: 'Complaint updated successfully',
      data: { complaint: formatComplaintForUser(complaint, req.user.id) }
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating complaint'
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

    // Wardens only see complaints from their hostel
    if (req.user.role === 'warden') {
      filter.hostelBlock = req.user.hostelBlock;
    }
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (hostelBlock) filter.hostelBlock = hostelBlock;
    if (roomNumber) filter.roomNumber = roomNumber;

    // Students can see all complaints; anonymity is enforced via masking in formatComplaintForUser

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

    const mapped = complaints.map((c) => formatComplaintForUser(c, req.user.id));

    res.status(200).json({
      status: 'success',
      data: {
        complaints: mapped,
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

    res.status(200).json({
      status: 'success',
      data: { complaint: formatComplaintForUser(complaint, req.user.id) }
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
      if (!['pending', 'in-progress', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status'
        });
      }
      complaint.status = status;
      
      // Set actual resolution time when resolved
      if (status === 'resolved') {
        complaint.actualResolutionTime = new Date();
      }
    }
    
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
    if (estimatedResolutionTime) complaint.estimatedResolutionTime = new Date(estimatedResolutionTime);

    // Auto-refresh priority based on age/status
    complaint.priority = computePriority(complaint.category, complaint.createdAt, complaint.status);

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

    if (complaint.reportedBy.toString() === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot upvote your own complaint'
      });
    }

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
  updateComplaint,
  addComplaintFeedback,
  upvoteComplaint,
  removeUpvote,
  getComplaintStats
};
