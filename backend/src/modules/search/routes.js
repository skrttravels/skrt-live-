const express = require('express');
const { globalSearch } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, globalSearch);

module.exports = router;
