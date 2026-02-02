const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  validateResourceRequest,
  validateFulfillResourceRequest
} = require('../middleware/validation');
const {
  createResourceRequest,
  getResourceRequests,
  cancelResourceRequest,
  fulfillResourceRequest
} = require('../controllers/resourceRequestController');

router.use(protect);

router.post('/', validateResourceRequest, createResourceRequest);
router.get('/', getResourceRequests);

router.put('/:id/cancel', cancelResourceRequest);
router.post('/:id/fulfill', validateFulfillResourceRequest, fulfillResourceRequest);

module.exports = router;
