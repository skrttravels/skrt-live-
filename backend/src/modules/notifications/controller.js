const Notification = require('./model');
const sendResponse = require('../../utils/response');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { user: req.user._id },
        { user: null }
      ]
    })
      .select('_id user title message type read link createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return sendResponse(res, 200, true, 'Notifications fetched successfully', notifications);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    return sendResponse(res, 200, true, 'Notification marked as read');
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.createNotification = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);
    return sendResponse(res, 201, true, 'Notification created successfully', notification);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
