const express = require('express');
const router = express.Router();
const { getCompanySettings, updateCompanySettings, getPermissions, updatePermissions } = require('./controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.get('/company', protect, getCompanySettings);
router.put('/company', protect, authorize('admin', 'manager'), updateCompanySettings);

router.get('/permissions', protect, authorize('admin'), getPermissions);
router.put('/permissions', protect, authorize('admin'), updatePermissions);

module.exports = router;
