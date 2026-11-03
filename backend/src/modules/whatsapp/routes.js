const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware');
const { sendPDF, getStatus } = require('./controller');

router.post('/send-pdf', protect, sendPDF);
router.get('/status', protect, getStatus);

module.exports = router;
