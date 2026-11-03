const express = require('express');
const { getSuggestions } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/:type', protect, getSuggestions);

module.exports = router;
