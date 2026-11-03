const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

const cacheForSeconds = (seconds) => (req, res, next) => {
  res.set('Cache-Control', `private, max-age=${seconds}`);
  res.vary('Authorization');
  next();
};

router.get('/', protect, cacheForSeconds(55), controller.getNotifications);
router.patch('/:id/read', protect, controller.markAsRead);
router.post('/', protect, controller.createNotification);

module.exports = router;
