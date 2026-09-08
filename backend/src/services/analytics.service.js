const db = require('./firestore');
const { LRUCache } = require('../utils/cache');

const platformCache = new LRUCache(1);
const collegeCache = new LRUCache(100);

const PLATFORM_DOC = 'platform';

const countCollection = async (query) => {
  const snapshot = await query.count().get();
  return snapshot.data().count || 0;
};

const computeAverageScore = (stats) => {
  const sum = stats.totalScoreSum || 0;
  const count = stats.totalScoreCount || 0;
  return count ? sum / count : 0;
};

const getPlatformStats = async () => {
  const cached = platformCache.get(PLATFORM_DOC);
  if (cached) return cached;

  const snap = await db.collection('platformStats').doc(PLATFORM_DOC).get();
  const stats = snap.exists ? snap.data() : {};
  const enriched = {
    ...stats,
    averageScore: computeAverageScore(stats),
  };
  platformCache.set(PLATFORM_DOC, enriched);
  return enriched;
};

const getCollegeStats = async (collegeId) => {
  if (!collegeId) return {};
  const cached = collegeCache.get(collegeId);
  if (cached) return cached;

  const snap = await db.collection('collegeStats').doc(collegeId).get();
  const stats = snap.exists ? snap.data() : {};
  const enriched = {
    ...stats,
    averageScore: computeAverageScore(stats),
  };
  collegeCache.set(collegeId, enriched);
  return enriched;
};

const generateAnalyticsSnapshot = async ({ snapshotType, collegeId }) => {
  const createdAt = new Date().toISOString();

  const usersQuery = snapshotType === 'college'
    ? db.collection('users').where('collegeId', '==', collegeId)
    : db.collection('users');

  const facultyQuery = usersQuery.where('role', '==', 'faculty');
  const recruitersQuery = db.collection('users').where('role', '==', 'recruiter');

  const eventsQuery = snapshotType === 'college'
    ? db.collection('events').where('collegeId', '==', collegeId)
    : db.collection('events');
  const clubsQuery = snapshotType === 'college'
    ? db.collection('clubs').where('collegeId', '==', collegeId)
    : db.collection('clubs');
  const teamsQuery = snapshotType === 'college'
    ? db.collection('teams').where('collegeId', '==', collegeId)
    : db.collection('teams');

  const jobPostsQuery = db.collection('jobPosts');
  const applicationsQuery = snapshotType === 'college'
    ? db.collection('jobApplications').where('collegeId', '==', collegeId)
    : db.collection('jobApplications');

  const stats = snapshotType === 'college'
    ? await getCollegeStats(collegeId)
    : await getPlatformStats();

  const [
    totalFaculty,
    totalRecruiters,
    totalEvents,
    totalClubs,
    totalTeams,
    totalJobPosts,
    totalApplications,
  ] = await Promise.all([
    countCollection(facultyQuery),
    countCollection(recruitersQuery),
    countCollection(eventsQuery),
    countCollection(clubsQuery),
    countCollection(teamsQuery),
    countCollection(jobPostsQuery),
    countCollection(applicationsQuery),
  ]);

  const averageScore = computeAverageScore(stats);

  const snapshotRef = db.collection('analyticsSnapshots').doc();
  const snapshotDoc = {
    snapshotId: snapshotRef.id,
    snapshotType,
    collegeId: collegeId || null,
    totalUsers: typeof stats.totalUsers === 'number' ? stats.totalUsers : 0,
    totalStudents: typeof stats.totalStudents === 'number' ? stats.totalStudents : 0,
    totalVerifiedStudents: typeof stats.totalVerifiedStudents === 'number'
      ? stats.totalVerifiedStudents
      : 0,
    totalFaculty,
    totalRecruiters,
    totalEvents: typeof stats.totalEvents === 'number' ? stats.totalEvents : totalEvents,
    totalClubs: typeof stats.totalClubs === 'number' ? stats.totalClubs : totalClubs,
    totalTeams,
    totalJobPosts: typeof stats.totalJobPosts === 'number' ? stats.totalJobPosts : totalJobPosts,
    totalApplications: typeof stats.totalApplications === 'number'
      ? stats.totalApplications
      : totalApplications,
    averageScore,
    createdAt,
  };

  await snapshotRef.set(snapshotDoc);

  return snapshotDoc;
};

const getLatestSnapshot = async ({ snapshotType, collegeId }) => {
  let query = db
    .collection('analyticsSnapshots')
    .where('snapshotType', '==', snapshotType)
    .orderBy('createdAt', 'desc')
    .limit(1);

  if (snapshotType === 'college' && collegeId) {
    query = db
      .collection('analyticsSnapshots')
      .where('snapshotType', '==', 'college')
      .where('collegeId', '==', collegeId)
      .orderBy('createdAt', 'desc')
      .limit(1);
  }

  const snapshot = await query.get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const invalidatePlatformStatsCache = () => {
  platformCache.delete(PLATFORM_DOC);
};

const invalidateCollegeStatsCache = (collegeId) => {
  if (!collegeId) return;
  collegeCache.delete(collegeId);
};

module.exports = {
  generateAnalyticsSnapshot,
  getLatestSnapshot,
  getPlatformStats,
  getCollegeStats,
  invalidatePlatformStatsCache,
  invalidateCollegeStatsCache,
};
