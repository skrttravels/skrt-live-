const express = require('express');
const router = express.Router();
const { uploadFile, deleteFile } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

router.post('/', protect, uploadFile);
router.delete('/:publicId', protect, deleteFile);

module.exports = router;
