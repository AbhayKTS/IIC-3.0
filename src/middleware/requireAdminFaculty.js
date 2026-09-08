const CustomError = require('../utils/CustomError');
const { Roles, FacultySubRoles } = require('../utils/roles');

const requireAdminFaculty = (req, res, next) => {
  if (!req.userProfile) {
    return next(new CustomError('Missing user profile', 401, 'profile_missing'));
  }

  if (req.userProfile.role !== Roles.FACULTY || req.userProfile.subRole !== FacultySubRoles.ADMIN) {
    return next(new CustomError('Admin faculty only', 403, 'admin_only'));
  }

  return next();
};

module.exports = {
  requireAdminFaculty,
};
