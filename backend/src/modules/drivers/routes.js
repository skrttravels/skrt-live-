const express = require('express');
const router = express.Router();
const { getDrivers, getDriverById, createDriver, createDriverEntry, getDriverEntries } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

const cacheForSeconds = (seconds) => (req, res, next) => {
  res.set('Cache-Control', `private, max-age=${seconds}`);
  res.vary('Authorization');
  next();
};

router.route('/')
  .get(protect, getDrivers)
  .post(protect, requirePermission('drivers', 'create'), createDriver);

router.route('/entry')
  .post(protect, createDriverEntry)
  .get(protect, cacheForSeconds(5), getDriverEntries);

router.get('/:id', protect, getDriverById);

module.exports = router;
