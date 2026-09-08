const express = require('express');

const {
  listPendingStudents,
  verifyStudent,
  getStudentProfileForFaculty,
  getCollegeAnalytics,
  getCollegeAuditLogs,
} = require('../../controllers/faculty.controller');
const { createEvent } = require('../../controllers/events.controller');
const { approveClub, rejectClub } = require('../../controllers/clubs.controller');
const { createFacultyCommunity } = require('../../controllers/communities.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { Roles } = require('../../utils/roles');

const router = express.Router();

router.get(
  '/pending-students',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  listPendingStudents
);

router.post(
  '/verify-student',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  verifyStudent
);

router.get(
  '/student/:id',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  getStudentProfileForFaculty
);

router.post(
  '/events',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  createEvent
);

router.post(
  '/clubs/:clubId/approve',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  approveClub
);

router.post(
  '/clubs/:clubId/reject',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  rejectClub
);

router.post(
  '/communities',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  createFacultyCommunity
);

router.get(
  '/analytics',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  getCollegeAnalytics
);

router.get(
  '/audit-logs',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  getCollegeAuditLogs
);

module.exports = router;
