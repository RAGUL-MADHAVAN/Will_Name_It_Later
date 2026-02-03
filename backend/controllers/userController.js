const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');

// Get all users (admin/warden only)
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      hostelBlock,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (role) filter.role = role;
    if (hostelBlock) filter.hostelBlock = hostelBlock;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { roomNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users'
    });
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user'
    });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { name, email, role, hostelBlock, roomNumber, phoneNumber, isActive, isVerified } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (hostelBlock) user.hostelBlock = hostelBlock;
    if (roomNumber) user.roomNumber = roomNumber;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating user'
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user has active resources
    const activeResources = await Resource.countDocuments({
      owner: user._id,
      availability: 'borrowed'
    });

    if (activeResources > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete user with active borrowed resources'
      });
    }

    // Delete user's resources
    await Resource.deleteMany({ owner: user._id });

    // Delete user's complaints
    await Complaint.deleteMany({ reportedBy: user._id });

    // Delete user's notifications
    await Notification.deleteMany({ recipient: user._id });

    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting user'
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const { hostelBlock, timeRange = '30' } = req.query;
    
    // Calculate date range
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build filter
    const filter = { createdAt: { $gte: startDate } };
    if (hostelBlock) filter.hostelBlock = hostelBlock;

    // Get user statistics
    const stats = await Promise.all([
      User.countDocuments({ role: 'student', ...filter }),
      User.countDocuments({ role: 'warden', ...filter }),
      User.countDocuments({ role: 'admin', ...filter }),
      User.countDocuments({ isActive: true, ...filter }),
      User.countDocuments({ isActive: false, ...filter }),
      User.countDocuments({ isVerified: true, ...filter }),
      User.countDocuments(filter)
    ]);

    const [students, wardens, admins, active, inactive, verified, total] = stats;

    // Get hostel block breakdown
    const blockStats = await User.aggregate([
      { $match: filter },
      { $group: { _id: '$hostelBlock', count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    // Get new users trend (last 7 days)
    const newUsersTrend = await User.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get top users by reputation
    const topUsers = await User.find({ isActive: true })
      .sort({ reputation: -1 })
      .limit(10)
      .select('name reputation role hostelBlock roomNumber totalBorrowed totalLent');

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          students,
          wardens,
          admins,
          active,
          inactive,
          verified,
          total,
          verificationRate: total > 0 ? ((verified / total) * 100).toFixed(1) : 0
        },
        blockBreakdown: blockStats,
        newUsersTrend,
        topUsers
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user statistics'
    });
  }
};

// Get user dashboard data
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's complaints
    const userComplaints = await Complaint.find({ reportedBy: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's resources
    const userResources = await Resource.find({ owner: userId })
      .populate('currentBorrower', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's borrowed resources
    const borrowedResources = await Resource.find({ currentBorrower: userId })
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent notifications
    const recentNotifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get statistics
    const [
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      totalOwnedResources,
      availableResources,
      borrowedResourcesCount
    ] = await Promise.all([
      Complaint.countDocuments({ reportedBy: userId }),
      Complaint.countDocuments({ reportedBy: userId, status: 'pending' }),
      Complaint.countDocuments({ reportedBy: userId, status: 'resolved' }),
      Resource.countDocuments({ owner: userId }),
      Resource.countDocuments({ owner: userId, availability: 'available' }),
      Resource.countDocuments({ currentBorrower: userId })
    ]);

    // Get unread notifications count
    const unreadCount = await Notification.getUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          complaints: {
            total: totalComplaints,
            pending: pendingComplaints,
            resolved: resolvedComplaints
          },
          resources: {
            owned: totalOwnedResources,
            available: availableResources,
            borrowed: borrowedResourcesCount
          },
          notifications: {
            unread: unreadCount
          }
        },
        recent: {
          complaints: userComplaints,
          resources: userResources,
          borrowed: borrowedResources,
          notifications: recentNotifications
        }
      }
    });
  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user dashboard'
    });
  }
};

// Get admin dashboard data
const getAdminDashboard = async (req, res) => {
  try {
    // Only admins and wardens can access this
    if (req.user.role !== 'admin' && req.user.role !== 'warden') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin or warden role required.'
      });
    }

    const complaintScope = req.user.role === 'warden'
      ? { hostelBlock: req.user.hostelBlock }
      : {};
    const resourceScope = req.user.role === 'warden'
      ? { hostelBlock: req.user.hostelBlock }
      : {};
    const userScope = req.user.role === 'warden'
      ? { hostelBlock: req.user.hostelBlock }
      : {};

    // Get overall statistics
    const [
      totalUsers,
      totalComplaints,
      totalResources,
      pendingComplaints,
      inProgressComplaints,
      awaitingApprovalComplaints,
      resolvedComplaints,
      availableResources,
      borrowedResources
    ] = await Promise.all([
      User.countDocuments({ isActive: true, ...userScope }),
      Complaint.countDocuments(complaintScope),
      Resource.countDocuments(resourceScope),
      Complaint.countDocuments({ status: 'pending', ...complaintScope }),
      Complaint.countDocuments({ status: 'in-progress', ...complaintScope }),
      Complaint.countDocuments({ status: 'awaiting-approval', ...complaintScope }),
      Complaint.countDocuments({ status: 'resolved', ...complaintScope }),
      Resource.countDocuments({ availability: 'available', ...resourceScope }),
      Resource.countDocuments({ availability: 'borrowed', ...resourceScope })
    ]);

    // Get recent complaints
    const recentComplaints = await Complaint.find(complaintScope)
      .populate('reportedBy', 'name hostelBlock roomNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent resources
    const recentResources = await Resource.find(resourceScope)
      .populate('owner', 'name hostelBlock roomNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          users: totalUsers,
          complaints: {
            total: totalComplaints,
            pending: pendingComplaints,
            inProgress: inProgressComplaints,
            awaitingApproval: awaitingApprovalComplaints,
            resolved: resolvedComplaints
          },
          resources: {
            total: totalResources,
            available: availableResources,
            borrowed: borrowedResources
          }
        },
        recent: {
          complaints: recentComplaints,
          resources: recentResources
        }
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching admin dashboard'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  getUserDashboard,
  getAdminDashboard
};
