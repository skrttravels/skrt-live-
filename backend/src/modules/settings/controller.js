const CompanySettings = require('./model');
const RolePermission = require('./permissionModel');
const sendResponse = require('../../utils/response');
const { invalidatePermissionCache } = require('../../middleware/permissionMiddleware');

exports.getCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({});
    }
    return sendResponse(res, 200, true, 'Company settings fetched', settings);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({});
    }
    const { companyName, gstin, address, phone, email } = req.body;
    if (companyName !== undefined) settings.companyName = companyName;
    if (gstin !== undefined) settings.gstin = gstin;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;
    await settings.save();
    return sendResponse(res, 200, true, 'Company settings updated', settings);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.getPermissions = async (req, res) => {
  try {
    const role = req.query.role || 'manager';
    let rp = await RolePermission.findOne({ role });
    if (!rp) {
      rp = await RolePermission.create({ role, permissions: {} });
    }
    return sendResponse(res, 200, true, 'Permissions fetched', rp);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const role = req.query.role || 'manager';
    let rp = await RolePermission.findOne({ role });
    if (!rp) {
      rp = await RolePermission.create({ role, permissions: req.body });
    } else {
      rp.permissions = req.body;
      await rp.save();
    }
    invalidatePermissionCache(role);
    return sendResponse(res, 200, true, 'Permissions updated', rp);
  } catch (error) {
    return sendResponse(res, 500, false, error.message);
  }
};
