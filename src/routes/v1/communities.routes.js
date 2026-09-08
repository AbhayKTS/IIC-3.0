const express = require('express');

const { listCommunityMessages } = require('../../controllers/messages.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');

const router = express.Router();

router.get(
  '/:id/messages',
  verifyFirebaseToken,
  attachUserProfile,
  listCommunityMessages
);

module.exports = router;
