const express = require('express');

const { getStudentProfileForRecruiter, searchStudents } = require('../../controllers/recruiter.controller');
const {
  createJobPost,
  shortlistApplication,
  listJobApplications,
} = require('../../controllers/jobs.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { Roles } = require('../../utils/roles');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/student/:id',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.RECRUITER]),
  getStudentProfileForRecruiter
);

router.get(
  '/search',
  searchLimiter,
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.RECRUITER]),
  searchStudents
);

router.post(
  '/jobs',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.RECRUITER]),
  createJobPost
);

router.post(
  '/jobs/:jobId/shortlist/:applicationId',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.RECRUITER]),
  shortlistApplication
);

router.get(
  '/jobs/:jobId/applications',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.RECRUITER]),
  listJobApplications
);

module.exports = router;
