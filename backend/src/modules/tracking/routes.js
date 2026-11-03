const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

router.get('/', protect, controller.getAllLocations);
router.get('/:vehicleId', protect, controller.getVehicleLocation);
router.post('/update', protect, controller.updateLocation);

module.exports = router;
