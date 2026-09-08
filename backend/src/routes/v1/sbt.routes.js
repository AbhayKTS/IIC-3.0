/**
 * SBT Routes — Admin-protected routes for SBT minting & management
 */
const express = require('express');
const {
  listStudents,
  verifyStudent,
  mintSbt,
  getStudentSbts,
  getStudentWallet,
  getStats,
} = require('../../controllers/sbt.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { requireAdminFaculty } = require('../../middleware/requireAdminFaculty');
const { Roles } = require('../../utils/roles');

const router = express.Router();

// Public: Get SBT stats
router.get('/stats', getStats);

// Public: View student SBTs (for profile display)
router.get('/tokens/:studentId', getStudentSbts);

// Public: View student wallet address
router.get('/wallet/:studentId', getStudentWallet);

// Admin-only: List all students with their wallet/SBT status
router.get(
  '/students',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  listStudents
);

// Admin-only: Verify student — generate wallet + mint first SBT
router.post(
  '/verify/:studentId',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  verifyStudent
);

// Admin-only: Mint an achievement SBT
router.post(
  '/mint/:studentId',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.FACULTY]),
  requireAdminFaculty,
  mintSbt
);

module.exports = router;
