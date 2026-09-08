const express = require('express');

const {
  getStudentOverview,
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
} = require('../../controllers/student.controller');
const { registerForEvent, cancelEventRegistration } = require('../../controllers/events.controller');
const {
  applyForClub,
  joinClub,
  leaveClub,
} = require('../../controllers/clubs.controller');
const {
  applyToJob,
  listStudentApplications,
} = require('../../controllers/jobs.controller');
const {
  createTeam,
  requestJoinTeam,
  approveJoinRequest,
} = require('../../controllers/teams.controller');
const { createStudentCommunity } = require('../../controllers/communities.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { requireVerifiedStudent } = require('../../middleware/requireVerifiedStudent');
const { Roles } = require('../../utils/roles');

const router = express.Router();

router.get(
  '/me',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  getStudentOverview
);

router.post(
  '/profile',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  createStudentProfile
);

router.put(
  '/profile',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  updateStudentProfile
);

router.get(
  '/profile',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  getStudentProfile
);

router.post(
  '/events/:eventId/register',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  registerForEvent
);

router.post(
  '/events/:eventId/cancel',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  cancelEventRegistration
);

router.post(
  '/events/:eventId/create-team',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  createTeam
);

router.post(
  '/teams/:teamId/request-join',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  requestJoinTeam
);

router.post(
  '/teams/:teamId/approve/:requestId',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  approveJoinRequest
);

router.post(
  '/clubs/apply',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  applyForClub
);

router.post(
  '/clubs/:clubId/join',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  joinClub
);

router.post(
  '/clubs/:clubId/leave',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  leaveClub
);

router.post(
  '/jobs/:jobId/apply',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  applyToJob
);

router.get(
  '/applications',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  listStudentApplications
);

router.post(
  '/communities',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT]),
  requireVerifiedStudent,
  createStudentCommunity
);

module.exports = router;
