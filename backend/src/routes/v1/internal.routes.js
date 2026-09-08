const express = require('express');
const db = require('../../services/firestore');
const CustomError = require('../../utils/CustomError');
const { ok } = require('../../utils/response');
const { matchJobsForStudent } = require('../../services/jobMatching.service');
const logger = require('../../utils/logger');

const router = express.Router();

/**
 * Middleware to verify server-to-server internal shared secret key.
 */
const requireInternalKey = (req, res, next) => {
  const configuredKey = process.env.N8N_INTERNAL_KEY;
  if (!configuredKey) {
    logger.warn('[InternalAPI] N8N_INTERNAL_KEY not configured on server');
    throw new CustomError('Internal authentication unconfigured', 500, 'internal_auth_unconfigured');
  }

  const providedKey =
    req.headers['x-internal-key'] ||
    req.headers['x-n8n-key'] ||
    req.headers['x-n8n-internal-key'];

  if (!providedKey || providedKey !== configuredKey) {
    throw new CustomError('Unauthorized internal request', 401, 'unauthorized_internal');
  }

  return next();
};

router.use(requireInternalKey);

/**
 * GET /api/v1/internal/student/:studentId
 * Allows n8n to fetch student profile & skills
 */
router.get('/student/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const userSnap = await db.collection('users').doc(studentId).get();
    if (!userSnap.exists) {
      throw new CustomError('Student not found', 404, 'student_not_found');
    }

    const profileSnap = await db.collection('studentProfiles').doc(studentId).get();
    const userData = userSnap.data();
    const profileData = profileSnap.exists ? profileSnap.data() : {};

    return ok(res, {
      studentId,
      name: userData.name || profileData.name || null,
      email: userData.email,
      collegeId: userData.collegeId,
      verificationStatus: userData.verificationStatus,
      skills: userData.skills || profileData.skills || [],
      education: profileData.education || [],
      experience: profileData.experience || [],
      projects: profileData.projects || [],
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/v1/internal/jobs
 * Allows n8n to fetch active open job positions
 */
router.get('/jobs', async (req, res, next) => {
  try {
    const jobsSnap = await db.collection('jobs').where('status', '==', 'open').limit(50).get();
    const jobs = jobsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ok(res, { count: jobs.length, jobs });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/internal/notifications
 * Allows n8n to push notifications and recommendations for matched jobs
 */
router.post('/notifications', async (req, res, next) => {
  try {
    const { studentId, jobId, title, message, matchScore, matchingSkills, reason } = req.body || {};

    if (!studentId) {
      throw new CustomError('studentId is required', 400, 'missing_student_id');
    }

    const now = new Date().toISOString();
    const notifId = jobId ? `${studentId}_${jobId}_job_match` : db.collection('notifications').doc().id;

    // Save notification
    await db.collection('notifications').doc(notifId).set({
      notificationId: notifId,
      userId: studentId,
      type: 'job',
      title: title || 'New Opportunity Match',
      message: message || 'A new opportunity matches your verified profile.',
      referenceId: jobId || null,
      matchScore: matchScore || null,
      isRead: false,
      createdAt: now,
      source: 'n8n',
    }, { merge: true });

    // If job details are provided, save recommendation record
    if (jobId) {
      const recId = `${studentId}_${jobId}`;
      await db.collection('jobRecommendations').doc(recId).set({
        studentId,
        jobId,
        title: title || 'Recommended Role',
        matchScore: matchScore || 50,
        matchingSkills: matchingSkills || [],
        reason: reason || 'Matched by workflow automation',
        updatedAt: now,
        source: 'n8n',
      }, { merge: true });
    }

    return ok(res, { success: true, notificationId: notifId });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/internal/match-jobs
 * Trigger matching computation for a student
 */
router.post('/match-jobs', async (req, res, next) => {
  try {
    const { studentId } = req.body || {};
    if (!studentId) {
      throw new CustomError('studentId is required', 400, 'missing_student_id');
    }
    const matches = await matchJobsForStudent(studentId);
    return ok(res, { count: matches.length, matches });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
