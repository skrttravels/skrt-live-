const express = require('express');
const router = express.Router();
const { getDashboardStats, getDetailedAnalytics, getDashboardOverview, getAnalysis } = require('./controller');
const { protect } = require('../../middleware/authMiddleware');

const shortPrivateCache = (req, res, next) => {
  res.set('Cache-Control', 'private, max-age=5');
  res.vary('Authorization');
  next();
};

router.get('/dashboard', protect, getDashboardStats);
router.get('/detailed', protect, getDetailedAnalytics);
router.get('/dashboard-overview', protect, shortPrivateCache, getDashboardOverview);
router.get('/analysis', protect, getAnalysis);

module.exports = router;
