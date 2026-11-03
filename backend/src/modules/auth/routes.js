const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  adminResetPassword,
  getMyPermissions
} = require('./controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

// ── Public ──────────────────────────────────────────────
router.post('/login', login);

// ── Self (any authenticated user) ───────────────────────
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.get('/my-permissions', protect, getMyPermissions);

// ── Admin-only: User Management ──────────────────────────
router.post('/register', protect, authorize('admin', 'manager'), register);
router.get('/users', protect, authorize('admin'), getUsers);
router.get('/users/:id', protect, authorize('admin'), getUserById);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.post('/users/:id/reset-password', protect, authorize('admin'), adminResetPassword);

module.exports = router;
