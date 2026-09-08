const express = require('express');

const { listEvents } = require('../../controllers/events.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireRole } = require('../../middleware/requireRole');
const { Roles } = require('../../utils/roles');

const router = express.Router();

router.get(
  '/',
  verifyFirebaseToken,
  attachUserProfile,
  requireRole([Roles.STUDENT, Roles.FACULTY, Roles.RECRUITER]),
  listEvents
);

module.exports = router;
