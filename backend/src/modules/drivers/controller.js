const User = require('../auth/model');
const Driver = require('./driverModel');
const sendResponse = require('../../utils/response');

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' });
    return sendResponse(res, 200, true, 'Drivers fetched successfully', drivers);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get driver by ID
// @route   GET /api/drivers/:id
// @access  Private
exports.getDriverById = async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (driver) {
      return sendResponse(res, 200, true, 'Driver fetched successfully', driver);
    } else {
      return sendResponse(res, 404, false, 'Driver not found');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Create new driver
// @route   POST /api/drivers
// @access  Private/Admin
exports.createDriver = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const driver = await User.create({
      name,
      email,
      phone,
      password,
      role: 'driver'
    });
    return sendResponse(res, 201, true, 'Driver created successfully', driver);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Create a driver entry (standalone driver record)
// @route   POST /api/drivers/entry
// @access  Private
exports.createDriverEntry = async (req, res) => {
  try {
    const { name, vehicleNumber, phone } = req.body;
    const driver = await Driver.create({ name, vehicleNumber, phone });
    return sendResponse(res, 201, true, 'Driver entry created successfully', driver);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Get all driver entries
// @route   GET /api/drivers/entry
// @access  Private
exports.getDriverEntries = async (req, res) => {
  try {
    const drivers = await Driver.find()
      .select('_id name vehicleNumber phone createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();
    return sendResponse(res, 200, true, 'Driver entries fetched successfully', drivers);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
