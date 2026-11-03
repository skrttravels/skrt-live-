const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, getExpenseStats } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/stats')
  .get(protect, getExpenseStats);

router.route('/')
  .get(protect, getExpenses)
  .post(protect, requirePermission('expenses', 'create'), createExpense);

module.exports = router;
