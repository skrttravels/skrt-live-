const cloudinary = require('../../config/cloudinary');
const sendResponse = require('../../utils/response');

// @desc    Upload a file/image to Cloudinary
// @route   POST /api/upload
// @access  Private
exports.uploadFile = async (req, res) => {
  try {
    const { file, folder = 'skrt_transport', resourceType = 'auto' } = req.body;

    if (!file) {
      return sendResponse(res, 400, false, 'No file provided. Send base64 string in "file" field.');
    }

    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: resourceType,
      ...(resourceType !== 'raw' && { allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'gif'] }),
      max_bytes: 10 * 1024 * 1024 // 10MB
    });

    return sendResponse(res, 200, true, 'File uploaded successfully', {
      url:       result.secure_url,
      publicId:  result.public_id,
      format:    result.format,
      size:      result.bytes,
      width:     result.width,
      height:    result.height,
      createdAt: result.created_at
    });
  } catch (error) {
    return sendResponse(res, 500, false, `Upload failed: ${error.message}`);
  }
};

// @desc    Delete a file from Cloudinary
// @route   DELETE /api/upload/:publicId
// @access  Private
exports.deleteFile = async (req, res) => {
  try {
    const { publicId } = req.params;
    if (!publicId) return sendResponse(res, 400, false, 'publicId is required');

    const result = await cloudinary.uploader.destroy(decodeURIComponent(publicId));

    if (result.result === 'ok') {
      return sendResponse(res, 200, true, 'File deleted successfully');
    } else {
      return sendResponse(res, 404, false, 'File not found or already deleted');
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
