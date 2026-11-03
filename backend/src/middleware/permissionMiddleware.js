const RolePermission = require('../modules/settings/permissionModel');
const permissionCache = new Map();
const PERMISSION_CACHE_MS = 10000;
const invalidatePermissionCache = (role) => permissionCache.delete(role);

const getRolePermissions = async (role) => {
  const cached = permissionCache.get(role);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const rp = await RolePermission.findOne({ role }).select('permissions').lean();
  const permissions = rp?.permissions || null;
  permissionCache.set(role, { permissions, expiresAt: Date.now() + PERMISSION_CACHE_MS });
  return permissions;
};

const requirePermission = (module, action) => {
  return async (req, res, next) => {
    if (req.user.role === 'admin') return next();
    try {
      const permissions = await getRolePermissions(req.user.role);
      if (permissions && permissions[module] && permissions[module][action]) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Forbidden' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };
};

module.exports = { requirePermission, invalidatePermissionCache, getRolePermissions };
