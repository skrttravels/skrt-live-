const express = require('express');
const router = express.Router();
const {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
  generateChallan,
  getChallan,
  updateChallan
} = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .post(protect, requirePermission('inventory', 'create'), createInventory)
  .get(protect, getInventories);

router.route('/:id')
  .get(protect, getInventoryById)
  .put(protect, requirePermission('inventory', 'edit'), updateInventory)
  .delete(protect, requirePermission('inventory', 'delete'), deleteInventory);

router.route('/:id/challan')
  .post(protect, requirePermission('inventory', 'create'), generateChallan)
  .get(protect, getChallan)
  .put(protect, requirePermission('inventory', 'edit'), updateChallan);

module.exports = router;
