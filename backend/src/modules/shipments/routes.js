const express = require('express');
const router = express.Router();
const { createShipment, getShipments, getShipmentById, updateShipment, deleteShipment, updateStatus, getNextNumber, getByConsignmentNumber, getPartySuggestions } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

router.route('/')
  .post(protect, requirePermission('shipments', 'create'), createShipment)
  .get(protect, getShipments);

router.route('/next-number')
  .get(protect, getNextNumber);

router.route('/parties')
  .get(protect, getPartySuggestions);

router.route('/consignment/:consignmentNo')
  .get(protect, getByConsignmentNumber);

router.route('/:id')
  .get(protect, getShipmentById)
  .put(protect, requirePermission('shipments', 'edit'), updateShipment)
  .delete(protect, requirePermission('shipments', 'delete'), deleteShipment);

router.route('/:id/status')
  .patch(protect, requirePermission('shipments', 'edit'), updateStatus);

module.exports = router;
