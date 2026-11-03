const express = require('express');
const router = express.Router();
const {
  createCashMemo,
  getCashMemos,
  getNextDrNo,
  getCashMemoByGrNo,
  getCashMemoByDrNo,
  getCashMemoById,
  updateCashMemo,
  deleteCashMemo
} = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
  .post(protect, createCashMemo)
  .get(protect, getCashMemos);

router.get('/next-dr-no', protect, getNextDrNo);

router.route('/grno/:grNo')
  .get(protect, getCashMemoByGrNo);

router.route('/drno/:drNo')
  .get(protect, getCashMemoByDrNo);

router.route('/:id')
  .get(protect, getCashMemoById)
  .put(protect, updateCashMemo)
  .delete(protect, deleteCashMemo);

module.exports = router;
