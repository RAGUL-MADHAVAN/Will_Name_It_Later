const express = require('express');
const router = express.Router();
const ResourceRequest = require('../models/ResourceRequest');
const { protect } = require('../middleware/auth');

// Create a new resource request
router.post('/', protect, async (req, res) => {
  try {
    console.log('POST /api/resource-requests hit');
    console.log('Headers auth:', req.headers.authorization);
    console.log('User from protect:', req.user);
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: no user attached'
      });
    }
    console.log('POST /api/resource-requests body:', req.body);
    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Title, description, and category are required'
      });
    }

    const request = new ResourceRequest({
      title,
      description,
      category,
      requestedBy: req.user.id,
      status: 'open'
    });

    await request.save();
    console.log('Request saved:', request);

    res.status(201).json({
      status: 'success',
      message: 'Request created successfully',
      data: { request }
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get resource requests (with optional filters)
router.get('/', protect, async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const requests = await ResourceRequest.find(filter)
      .populate('requestedBy', 'name hostelBlock roomNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { requests }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching requests'
    });
  }
});

// Cancel a request (requester only)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    if (request.requestedBy.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only cancel your own requests'
      });
    }

    if (request.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'Only open requests can be cancelled'
      });
    }

    request.status = 'cancelled';
    await request.save();

    res.status(200).json({
      status: 'success',
      message: 'Request cancelled',
      data: { request }
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while cancelling request'
    });
  }
});

// Fulfill a request (creates a resource and marks request fulfilled)
router.post('/:id/fulfill', protect, async (req, res) => {
  try {
    const { title, description, condition, imageUrl } = req.body;
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Request not found'
      });
    }

    if (request.status !== 'open') {
      return res.status(400).json({
        status: 'error',
        message: 'This request is no longer open'
      });
    }

    // Create a resource from the fulfillment
    const Resource = require('../models/Resource');
    const resource = new Resource({
      name: title,
      description,
      category: request.category,
      condition,
      hostelBlock: req.user.hostelBlock,
      roomNumber: req.user.roomNumber,
      owner: req.user.id,
      images: imageUrl ? [imageUrl] : [],
      availability: 'available'
    });

    await resource.save();

    // Mark request as fulfilled
    request.status = 'fulfilled';
    await request.save();

    res.status(201).json({
      status: 'success',
      message: 'Request fulfilled and resource listed',
      data: { resource }
    });
  } catch (error) {
    console.error('Fulfill request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fulfilling request'
    });
  }
});

module.exports = router;
