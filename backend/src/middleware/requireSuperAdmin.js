const CustomError = require('../utils/CustomError');

const requireSuperAdmin = (req, res, next) => {
  if (!req.userProfile) {
    return next(new CustomError('Missing user profile', 401, 'profile_missing'));
  }

  if (req.userProfile.platformRole !== 'superAdmin') {
    return next(new CustomError('Super admin only', 403, 'superadmin_only'));
  }

  return next();
};

module.exports = {
  requireSuperAdmin,
};
