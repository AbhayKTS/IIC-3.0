const CustomError = require('../utils/CustomError');

const requireRole = (roles) => (req, res, next) => {
  if (!req.userProfile || !req.userProfile.role) {
    return next(new CustomError('Missing user profile', 401, 'profile_missing'));
  }

  if (!roles.includes(req.userProfile.role)) {
    return next(new CustomError('Forbidden', 403, 'role_forbidden'));
  }

  return next();
};

module.exports = {
  requireRole,
};
