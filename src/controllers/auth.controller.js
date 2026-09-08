const { ok } = require('../utils/response');

const bootstrapSession = (req, res) => {
  return ok(res, {
    uid: req.userProfile.uid,
    role: req.userProfile.role,
    subRole: req.userProfile.subRole,
    collegeId: req.userProfile.collegeId,
    verificationStatus: req.userProfile.verificationStatus,
  });
};

module.exports = {
  bootstrapSession,
};
