const express = require('express');
const router = express.Router();
const controller = require('./controller');

// Public tracking lookup used by the landing page — no auth required.
router.get('/:vehicleNumber', controller.getPublicTracking);

module.exports = router;
