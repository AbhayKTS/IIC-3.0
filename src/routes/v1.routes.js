const express = require('express');

const statusRoutes = require('./v1/status.routes');
const authRoutes = require('./v1/auth.routes');
const adminRoutes = require('./v1/admin.routes');
const facultyRoutes = require('./v1/faculty.routes');
const communitiesRoutes = require('./v1/communities.routes');
const eventsRoutes = require('./v1/events.routes');
const recruiterRoutes = require('./v1/recruiter.routes');
const studentRoutes = require('./v1/student.routes');
const userRoutes = require('./v1/user.routes');
const compatRoutes = require('./v1/compat.routes');
const aiRoutes = require('./v1/ai.routes');
const sbtRoutes = require('./v1/sbt.routes');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/', (req, res) => ok(res, {
	status: 'ok',
	message: 'CollegeVerse API v1 online',
	timestamp: new Date().toISOString(),
}));

router.use('/status', statusRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/faculty', facultyRoutes);
router.use('/communities', communitiesRoutes);
router.use('/events', eventsRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/student', studentRoutes);
router.use('/user', userRoutes);
router.use('/compat', compatRoutes);
router.use('/ai', aiRoutes);
router.use('/sbt', sbtRoutes);

module.exports = router;
