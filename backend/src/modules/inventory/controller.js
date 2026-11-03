const Inventory = require('./model');
const sendResponse = require('../../utils/response');

// @desc    Create new inventory record
// @route   POST /api/inventory
// @access  Private
exports.createInventory = async (req, res) => {
  try {
    const { weight, rate } = req.body;
    const totalFreight = (weight || 0) * (rate || 0);

    const inventory = await Inventory.create({
      ...req.body,
      totalFreight,
      createdBy: req.user ? req.user._id : undefined
    });

    return sendResponse(res, 201, true, 'Inventory created successfully', inventory);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Get all inventory records
// @route   GET /api/inventory
// @access  Private
exports.getInventories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { cargoName: regex },
        { senderName: regex },
        { receiverName: regex },
        { origin: regex },
        { destination: regex }
      ];
    }
    const inventories = await Inventory.find(filter).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Inventory records fetched successfully', inventories);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Get single inventory record
// @route   GET /api/inventory/:id
// @access  Private
exports.getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return sendResponse(res, 404, false, 'Inventory record not found');
    }
    return sendResponse(res, 200, true, 'Inventory record fetched successfully', inventory);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update inventory record
// @route   PUT /api/inventory/:id
// @access  Private
exports.updateInventory = async (req, res) => {
  try {
    const { weight, rate } = req.body;
    let updateData = { ...req.body };
    
    if (weight !== undefined && rate !== undefined) {
      updateData.totalFreight = weight * rate;
    }

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!inventory) {
      return sendResponse(res, 404, false, 'Inventory record not found');
    }

    return sendResponse(res, 200, true, 'Inventory updated successfully', inventory);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Delete inventory record
// @route   DELETE /api/inventory/:id
// @access  Private
exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventory) {
      return sendResponse(res, 404, false, 'Inventory record not found');
    }

    return sendResponse(res, 200, true, 'Inventory record deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Generate Challan for inventory record
// @route   POST /api/inventory/:id/challan
// @access  Private
exports.generateChallan = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return sendResponse(res, 404, false, 'Inventory record not found');
    }

    const challanData = {
      challanNo: req.body.challanNo || `CH-${Date.now()}`,
      vehicleNumber: req.body.vehicleNumber,
      driverName: req.body.driverName,
      driverPhone: req.body.driverPhone,
      fromLocation: req.body.fromLocation,
      toLocation: req.body.toLocation,
      dispatchDate: req.body.dispatchDate ? new Date(req.body.dispatchDate) : new Date(),
      packages: Number(req.body.packages || inventory.packages),
      weight: Number(req.body.weight || inventory.weight),
      remarks: req.body.remarks || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    inventory.challanData = challanData;
    inventory.challanStatus = 'Created';
    inventory.updatedAt = new Date();

    const updatedInventory = await inventory.save();

    return sendResponse(res, 201, true, 'Challan generated successfully', updatedInventory);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Get Challan for inventory record
// @route   GET /api/inventory/:id/challan
// @access  Private
exports.getChallan = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory || !inventory.challanData) {
      return sendResponse(res, 404, false, 'Challan not found for this inventory record');
    }

    return sendResponse(res, 200, true, 'Challan fetched successfully', inventory.challanData);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Update Challan for inventory record
// @route   PUT /api/inventory/:id/challan
// @access  Private
exports.updateChallan = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory || !inventory.challanData) {
      return sendResponse(res, 404, false, 'Challan not found for this inventory record');
    }

    inventory.challanData = {
      ...inventory.challanData.toObject(),
      ...req.body,
      updatedAt: new Date()
    };
    inventory.updatedAt = new Date();

    const updatedInventory = await inventory.save();

    return sendResponse(res, 200, true, 'Challan updated successfully', updatedInventory);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};
