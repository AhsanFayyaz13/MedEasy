const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (decoded.role === 'pharmacist' && user.role === 'pharmacy' && user.pharmacistDetails) {
        user = user.toObject();
        user.role = 'pharmacist';
        user.name = user.pharmacistDetails.name || user.name;
        user.email = user.pharmacistDetails.email || user.email;
      }
      req.user = user;
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Treat 'pharmacy' as an authorized alias for 'pharmacist' routes
    const effectiveRoles = roles.map(r => r === 'pharmacist' ? 'pharmacy' : r);

    if (!req.user || (!roles.includes(req.user.role) && !effectiveRoles.includes(req.user.role))) {
      return res.status(403).json({ message: 'User role not authorized' });
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };
