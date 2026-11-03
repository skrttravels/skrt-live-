const express = require('express');
const router = express.Router();
const { 
  getVehicles, 
  getVehicleById, 
  createVehicle, 
  updateVehicle, 
  updateStatus, 
  deleteVehicle 
} = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .get(protect, getVehicles)
  .post(protect, requirePermission('vehicles', 'create'), createVehicle);

router.route('/:id')
  .get(protect, getVehicleById)
  .patch(protect, requirePermission('vehicles', 'edit'), updateVehicle)
  .delete(protect, requirePermission('vehicles', 'delete'), deleteVehicle);

router.route('/:id/status')
  .patch(protect, requirePermission('vehicles', 'edit'), updateStatus);

module.exports = router;
