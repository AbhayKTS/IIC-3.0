const express = require('express');

const {
  createFaculty,
  recalculateRankings,
  getPlatformAnalytics,
  generatePlatformAnalytics,
  getAuditLogs,
  changeUserRole,
} = require('../../controllers/admin.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { requireAdminFaculty } = require('../../middleware/requireAdminFaculty');
const { Roles } = require('../../utils/roles');

const router = express.Router();

router.post(
  '/faculty',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  createFaculty
);

router.post(
  '/recalculate-rankings',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  recalculateRankings
);

router.get(
  '/analytics',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  getPlatformAnalytics
);

router.post(
  '/generate-analytics',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  generatePlatformAnalytics
);

router.get(
  '/audit-logs',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  getAuditLogs
);

router.post(
  '/change-role',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  changeUserRole
);

module.exports = router;
