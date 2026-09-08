const express = require('express');

const {
  listNotifications,
  markNotificationRead,
  markAllRead,
} = require('../../controllers/notifications.controller');
const { joinCommunity, leaveCommunity } = require('../../controllers/communities.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const { requireVerifiedStudent } = require('../../middleware/requireVerifiedStudent');

const router = express.Router();

router.get(
  '/notifications',
  verifyFirebaseToken,
  attachUserProfile,
  listNotifications
);

router.post(
  '/notifications/:id/read',
  verifyFirebaseToken,
  attachUserProfile,
  markNotificationRead
);

router.post(
  '/notifications/read-all',
  verifyFirebaseToken,
  attachUserProfile,
  markAllRead
);

router.post(
  '/communities/:communityId/join',
  verifyFirebaseToken,
  attachUserProfile,
  requireVerifiedStudent,
  joinCommunity
);

router.post(
  '/communities/:communityId/leave',
  verifyFirebaseToken,
  attachUserProfile,
  requireVerifiedStudent,
  leaveCommunity
);

module.exports = router;
