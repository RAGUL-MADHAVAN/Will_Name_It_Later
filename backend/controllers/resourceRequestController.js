const ResourceRequest = require('../models/ResourceRequest');
const Resource = require('../models/Resource');
const User = require('../models/User');
const Notification = require('../models/Notification');

const createResourceRequest = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    const resourceRequest = new ResourceRequest({
      title,
      description,
      category,
      requestedBy: req.user.id,
      status: 'open'
    });

    await resourceRequest.save();
    await resourceRequest.populate('requestedBy', 'name hostelBlock roomNumber');

    res.status(201).json({
      status: 'success',
      message: 'Resource request created successfully',
      data: { request: resourceRequest }
    });
  } catch (error) {
    console.error('Create resource request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating resource request'
    });
  }
};

const getResourceRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'open',
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const requests = await ResourceRequest.find(filter)
      .populate('requestedBy', 'name hostelBlock roomNumber')
      .populate('fulfilledBy', 'name hostelBlock roomNumber')
      .populate('fulfilledResource', 'name category')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ResourceRequest.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        requests,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get resource requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching resource requests'
    });
  }
};

const cancelResourceRequest = async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ status: 'error', message: 'Resource request not found' });
    }

    if (request.requestedBy.toString() !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Only the requester can cancel this request' });
    }

    if (request.status !== 'open') {
      return res.status(400).json({ status: 'error', message: 'Only open requests can be cancelled' });
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      status: 'success',
      message: 'Request cancelled successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Cancel resource request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while cancelling resource request'
    });
  }
};

const fulfillResourceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition, imageUrl, title, description } = req.body;

    const request = await ResourceRequest.findById(id);
    if (!request) {
      return res.status(404).json({ status: 'error', message: 'Resource request not found' });
    }

    if (request.status !== 'open') {
      return res.status(400).json({ status: 'error', message: 'Only open requests can be fulfilled' });
    }

    if (request.requestedBy.toString() === req.user.id) {
      return res.status(400).json({ status: 'error', message: 'You cannot fulfill your own request' });
    }

    const fulfiller = await User.findById(req.user.id).select('hostelBlock roomNumber name');
    if (!fulfiller?.hostelBlock || !fulfiller?.roomNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile missing hostel info. Update profile first.'
      });
    }

    const finalTitle = (title || '').trim() || request.title;
    const finalDescription = (description || '').trim() || request.description;

    const resource = new Resource({
      name: finalTitle,
      description: finalDescription,
      category: request.category,
      condition,
      owner: req.user.id,
      hostelBlock: fulfiller.hostelBlock,
      roomNumber: fulfiller.roomNumber,
      images: imageUrl ? [imageUrl] : [],
      isPublic: true
    });

    await resource.save();

    request.status = 'fulfilled';
    request.fulfilledBy = req.user.id;
    request.fulfilledResource = resource._id;
    request.fulfilledAt = new Date();
    await request.save();

    await User.findByIdAndUpdate(req.user.id, { $inc: { totalLent: 1 } });

    await Notification.createNotification({
      recipient: request.requestedBy,
      sender: req.user.id,
      title: 'Your request was fulfilled',
      message: `"${finalTitle}" is now available to borrow from ${fulfiller.name} (${fulfiller.hostelBlock} Block, Room ${fulfiller.roomNumber}).`,
      type: 'resource',
      category: 'new',
      priority: 'medium',
      relatedEntity: { entityType: 'resource', entityId: resource._id },
      actionUrl: `/resources/${resource._id}`,
      actionText: 'View Resource',
      metadata: {
        holderName: fulfiller.name,
        hostelBlock: fulfiller.hostelBlock,
        roomNumber: fulfiller.roomNumber
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Request fulfilled and resource created successfully',
      data: { request, resource }
    });
  } catch (error) {
    console.error('Fulfill resource request error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error while fulfilling resource request'
    });
  }
};

module.exports = {
  createResourceRequest,
  getResourceRequests,
  cancelResourceRequest,
  fulfillResourceRequest
};
