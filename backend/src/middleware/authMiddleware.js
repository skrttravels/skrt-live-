const jwt = require('jsonwebtoken');
const User = require('../modules/auth/model');
const { performance } = require('node:perf_hooks');

const authUserCache = new Map();
const AUTH_USER_CACHE_MS = 10000;

const invalidateAuthUserCache = (userId) => authUserCache.delete(String(userId));

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decodes token id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const cached = authUserCache.get(String(decoded.id));
      if (cached && cached.expiresAt > Date.now()) {
        req.user = cached.user;
        req.authCache = 'hit';
      } else {
        if (cached) authUserCache.delete(String(decoded.id));
        const authLookupStartedAt = performance.now();
        req.user = await User.findById(decoded.id).select('_id role').lean();
        req.authLookupMs = Math.round(performance.now() - authLookupStartedAt);
        req.authCache = 'miss';
        if (req.user) {
          authUserCache.set(String(decoded.id), {
            user: req.user,
            expiresAt: Date.now() + AUTH_USER_CACHE_MS
          });
        }
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize, invalidateAuthUserCache };
