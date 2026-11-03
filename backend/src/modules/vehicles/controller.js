const Vehicle = require('./model');
const sendResponse = require('../../utils/response');

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private
exports.getVehicles = async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { vehicleNo: regex },
        { model: regex },
        { 'owner.name': regex }
      ];
    }
    const vehicles = await Vehicle.find(filter);
    return sendResponse(res, 200, true, 'Vehicles fetched successfully', vehicles);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Private
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle) {
      return sendResponse(res, 200, true, 'Vehicle fetched successfully', vehicle);
    } else {
      return sendResponse(res, 404, false, 'Vehicle not found');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private/Admin
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    return sendResponse(res, 201, true, 'Vehicle created successfully', vehicle);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Update vehicle
// @route   PATCH /api/vehicles/:id
// @access  Private/Admin
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (vehicle) {
      return sendResponse(res, 200, true, 'Vehicle updated successfully', vehicle);
    } else {
      return sendResponse(res, 404, false, 'Vehicle not found');
    }
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Delete vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private/Admin
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (vehicle) {
      return sendResponse(res, 200, true, 'Vehicle deleted successfully');
    } else {
      return sendResponse(res, 404, false, 'Vehicle not found');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update vehicle status
// @route   PATCH /api/vehicles/:id/status
// @access  Private
exports.updateStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (vehicle) {
      vehicle.status = req.body.status || vehicle.status;
      const updatedVehicle = await vehicle.save();
      return sendResponse(res, 200, true, 'Vehicle status updated successfully', updatedVehicle);
    } else {
      return sendResponse(res, 404, false, 'Vehicle not found');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
