const CustomError = require('../utils/CustomError');
const { Roles } = require('../utils/roles');

const requireVerifiedStudent = (req, res, next) => {
  if (!req.userProfile) {
    return next(new CustomError('Missing user profile', 401, 'profile_missing'));
  }

  if (req.userProfile.role !== Roles.STUDENT) {
    return next(new CustomError('Student access only', 403, 'student_only'));
  }

  if (req.userProfile.verificationStatus !== 'verified') {
    return next(new CustomError('Student verification required', 403, 'student_unverified'));
  }

  return next();
};

module.exports = {
  requireVerifiedStudent,
};
