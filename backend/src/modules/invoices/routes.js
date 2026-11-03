const express = require('express');
const router = express.Router();
const { getInvoices, createInvoice } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .get(protect, getInvoices)
  .post(protect, requirePermission('invoices', 'create'), createInvoice);

module.exports = router;
