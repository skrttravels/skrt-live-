const Contact = require('./model');
const sendResponse = require('../../utils/response');

// @desc    Create contact
// @route   POST /api/contacts
// @access  Private/Operator
exports.createContact = async (req, res) => {
  try {
    const { type, gst, name, phoneNumber, state, building, place, city } = req.body;
    const contact = await Contact.create({
      type,
      gst,
      name,
      phoneNumber: phoneNumber || '',
      state: state || '',
      building: building || '',
      place: place || '',
      city: city || ''
    });
    return sendResponse(res, 201, true, 'Contact created successfully', contact);
  } catch (error) {
    return sendResponse(res, 400, false, error.message);
  }
};

// @desc    Get contacts
// @route   GET /api/contacts
// @access  Private
exports.getContacts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [
        { name: regex },
        { gst: regex }
      ];
    }
    const contacts = await Contact.find(filter).sort({ name: 1 });
    return sendResponse(res, 200, true, 'Contacts fetched successfully', contacts);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
