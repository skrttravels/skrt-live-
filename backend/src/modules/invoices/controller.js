const Invoice = require('./model');
const sendResponse = require('../../utils/response');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .populate('shipment')
      .lean();
    return sendResponse(res, 200, true, 'Invoices fetched successfully', invoices);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private/Operator
exports.createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    return sendResponse(res, 201, true, 'Invoice created successfully', invoice);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};
