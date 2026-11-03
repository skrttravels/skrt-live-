const Client = require('./model');
const sendResponse = require('../../utils/response');

exports.getClients = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { gstin: regex }, { email: regex }];
    }
    const clients = await Client.find(filter).sort({ createdAt: -1 }).lean();
    return sendResponse(res, 200, true, 'Clients fetched successfully', clients);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return sendResponse(res, 404, false, 'Client not found');
    return sendResponse(res, 200, true, 'Client fetched successfully', client);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    return sendResponse(res, 201, true, 'Client created successfully', client);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (client) {
      return sendResponse(res, 200, true, 'Client updated successfully', client);
    } else {
      return sendResponse(res, 404, false, 'Client not found');
    }
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return sendResponse(res, 404, false, 'Client not found');
    return sendResponse(res, 200, true, 'Client deleted successfully');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
