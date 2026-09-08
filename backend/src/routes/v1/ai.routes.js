const express = require('express');
const ai = require('../../controllers/ai.controller');

const router = express.Router();

// AI service status
router.get('/status', ai.status);

// Content moderation
router.post('/moderate', ai.moderate);

// Resume generation
router.post('/generate-resume', ai.generateResume);

// Student recommendations
router.post('/recommend-students', ai.recommendStudents);

module.exports = router;
