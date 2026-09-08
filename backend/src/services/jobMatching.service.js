const db = require('./firestore');
const logger = require('../utils/logger');

/**
 * Calculates deterministic job matching scores for a student based on real skills.
 * Upserts matches into Firestore `jobRecommendations` and creates notifications.
 *
 * @param {string} studentId
 * @returns {Promise<Array<{ jobId: string, title: string, matchScore: number, matchingSkills: string[], reason: string }>>}
 */
async function matchJobsForStudent(studentId) {
  if (!studentId) return [];

  try {
    // 1. Fetch student user and profile docs
    const userRef = db.collection('users').doc(studentId);
    const userSnap = await userRef.get();
    const profileRef = db.collection('studentProfiles').doc(studentId);
    const profileSnap = await profileRef.get();

    const userData = userSnap.exists ? userSnap.data() : {};
    const profileData = profileSnap.exists ? profileSnap.data() : {};

    // Combine skills from user doc (resume extraction) and profile doc
    const rawSkills = [
      ...(Array.isArray(userData.skills) ? userData.skills : []),
      ...(Array.isArray(profileData.skills) ? profileData.skills : []),
    ];

    const studentSkillsLower = new Set(
      rawSkills.map((s) => (typeof s === 'string' ? s : s?.name || '').trim().toLowerCase()).filter(Boolean)
    );

    // 2. Fetch open jobs
    const jobsSnap = await db.collection('jobs').where('status', '==', 'open').limit(25).get();
    if (jobsSnap.empty) {
      logger.debug(`[JobMatching] No open jobs found in Firestore for student ${studentId}`);
      return [];
    }

    const matches = [];
    const now = new Date().toISOString();

    for (const doc of jobsSnap.docs) {
      const job = { id: doc.id, ...doc.data() };
      const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];

      let matchScore = 50; // Base score if no specific required skills
      let matchingSkills = [];

      if (requiredSkills.length > 0) {
        matchingSkills = requiredSkills.filter((req) =>
          studentSkillsLower.has(String(req).trim().toLowerCase())
        );
        matchScore = Math.round((matchingSkills.length / requiredSkills.length) * 100);
      } else if (studentSkillsLower.size > 0) {
        matchScore = 65;
      }

      // Only recommend jobs with at least 30% match
      if (matchScore >= 30) {
        const reason = matchingSkills.length > 0
          ? `Matches ${matchingSkills.length} of ${requiredSkills.length} required skills: ${matchingSkills.slice(0, 4).join(', ')}`
          : 'Relevant opportunity matching your educational profile';

        const recommendation = {
          studentId,
          jobId: job.id,
          title: job.title || 'Opportunity',
          company: job.companyId || 'Partner Employer',
          location: job.location || 'Remote / Hybrid',
          jobType: job.jobType || 'Internship',
          matchScore,
          matchingSkills,
          reason,
          updatedAt: now,
        };

        // 3. Upsert into jobRecommendations with deterministic ID
        const recId = `${studentId}_${job.id}`;
        await db.collection('jobRecommendations').doc(recId).set(recommendation, { merge: true });

        // 4. Create deterministic notification if not already created
        const notifId = `${studentId}_${job.id}_job_match`;
        const notifRef = db.collection('notifications').doc(notifId);
        const existingNotif = await notifRef.get();

        if (!existingNotif.exists) {
          await notifRef.set({
            notificationId: notifId,
            userId: studentId,
            type: 'job',
            title: `Recommended: ${job.title}`,
            message: `${job.title} at ${recommendation.company} matches your profile (${matchScore}% match).`,
            referenceId: job.id,
            matchScore,
            isRead: false,
            createdAt: now,
          });
        }

        matches.push(recommendation);
      }
    }

    // Sort descending by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    return matches;
  } catch (err) {
    logger.warn(`[JobMatching] Failed to calculate matches for ${studentId}: ${err.message}`);
    return [];
  }
}

module.exports = {
  matchJobsForStudent,
};
