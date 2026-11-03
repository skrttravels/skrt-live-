const User = require('./model');
const generateToken = require('../../utils/generateToken');
const sendResponse = require('../../utils/response');
const bcrypt = require('bcryptjs');
const { invalidateAuthUserCache } = require('../../middleware/authMiddleware');
const { getRolePermissions } = require('../../middleware/permissionMiddleware');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendResponse(res, 400, false, 'Please provide email and password');
  }

  try {
    const user = await User.findOne({ email })
      .select('_id name email role phone +password')
      .lean();

    if (!user) {
      return sendResponse(res, 401, false, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid email or password');
    }

    const token = generateToken(user._id);

    return sendResponse(res, 200, true, 'Login successful', {
      _id:   user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      phone: user.phone,
      token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Admin / Manager
exports.register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    return sendResponse(res, 400, false, 'Please provide name, email and password');
  }

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return sendResponse(res, 400, false, 'User already exists');
    }

    const user = await User.create({ name, email, password, role, phone: phone || '' });

    if (user) {
      return sendResponse(res, 201, true, 'User registered successfully', {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone,
        token: generateToken(user._id)
      });
    } else {
      return sendResponse(res, 400, false, 'Invalid user data');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      return sendResponse(res, 200, true, 'Profile fetched successfully', {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone
      });
    } else {
      return sendResponse(res, 404, false, 'User not found');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update user profile (self)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendResponse(res, 404, false, 'User not found');

    user.name  = req.body.name  || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;

    const updated = await user.save();
    return sendResponse(res, 200, true, 'Profile updated successfully', {
      _id:   updated._id,
      name:  updated.name,
      email: updated.email,
      role:  updated.role,
      phone: updated.phone
    });
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Change own password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendResponse(res, 400, false, 'Please provide currentPassword and newPassword');
  }

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return sendResponse(res, 404, false, 'User not found');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return sendResponse(res, 401, false, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();

    return sendResponse(res, 200, true, 'Password changed successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// ─── Admin User Management ────────────────────────────────────────────────────

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Users fetched successfully', users);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get single user
// @route   GET /api/auth/users/:id
// @access  Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendResponse(res, 404, false, 'User not found');
    return sendResponse(res, 200, true, 'User fetched successfully', user);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update user (admin)
// @route   PUT /api/auth/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendResponse(res, 404, false, 'User not found');

    user.name  = req.body.name  || user.name;
    user.email = req.body.email || user.email;
    user.role  = req.body.role  || user.role;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;

    const updated = await user.save();
    invalidateAuthUserCache(updated._id);
    return sendResponse(res, 200, true, 'User updated successfully', updated);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/auth/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendResponse(res, 400, false, 'You cannot delete your own account');
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendResponse(res, 404, false, 'User not found');
    invalidateAuthUserCache(req.params.id);
    return sendResponse(res, 200, true, 'User deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get current user's permissions
// @route   GET /api/auth/my-permissions
// @access  Private
exports.getMyPermissions = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return sendResponse(res, 200, true, 'Permissions fetched', { all: true });
    }
    const permissions = await getRolePermissions(req.user.role);
    return sendResponse(res, 200, true, 'Permissions fetched', permissions || {});
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Admin reset user password
// @route   POST /api/auth/users/:id/reset-password
// @access  Admin
exports.adminResetPassword = async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return sendResponse(res, 400, false, 'New password must be at least 6 characters');
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendResponse(res, 404, false, 'User not found');

    user.password = newPassword;
    await user.save();

    return sendResponse(res, 200, true, 'Password reset successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
