const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Require a valid Bearer JWT. Attaches the current user to req.user.
 * Rejects suspended accounts and pharmacist sub-accounts that are no longer approved,
 * even if their token hasn't expired yet.
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next(new AppError(401, 'Not authorized, no token'));

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return next(new AppError(401, 'Not authorized, token failed'));
  }

  let user = await User.findById(decoded.id).select('-password');
  if (!user) return next(new AppError(401, 'Not authorized, user not found'));
  if (user.status === 'suspended') return next(new AppError(403, 'Your account has been suspended by the administrator.', 'ACCOUNT_SUSPENDED'));

  // Pharmacist representative signing in on behalf of a pharmacy account.
  if (decoded.role === 'pharmacist' && user.role === 'pharmacy') {
    if (user.pharmacistDetails?.status !== 'approved') {
      return next(new AppError(403, 'Pharmacist representative access has been revoked or is pending approval.'));
    }
    user = user.toObject();
    delete user.pharmacistDetails.password;
    user.role = 'pharmacist';
    user.name = user.pharmacistDetails.name || user.name;
    user.email = user.pharmacistDetails.email || user.email;
  }

  req.user = user;
  return next();
};

/**
 * Allow only the given roles. 'pharmacist' routes also accept pharmacy owners.
 */
const authorizeRoles = (...roles) => {
  const allowed = new Set(roles.flatMap((r) => (r === 'pharmacist' ? ['pharmacist', 'pharmacy'] : [r])));
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) return next(new AppError(403, 'User role not authorized'));
    return next();
  };
};

module.exports = { protect, authorizeRoles };
