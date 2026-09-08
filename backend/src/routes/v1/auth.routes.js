const express = require('express');

const { bootstrapSession } = require('../../controllers/auth.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
});

router.post('/bootstrap', loginLimiter, verifyFirebaseToken, attachUserProfile, bootstrapSession);

module.exports = router;
