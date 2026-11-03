const express = require('express');
const router = express.Router();
const { getContacts, createContact } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .get(protect, getContacts)
  .post(protect, requirePermission('contacts', 'create'), createContact);

module.exports = router;
