const admin = require('./firebaseAdmin');
const db = require('./firestore');
const { invalidatePlatformStatsCache, invalidateCollegeStatsCache } = require('./analytics.service');

const FIELD = admin.firestore.FieldValue;
const PLATFORM_DOC = 'platform';

const buildIncrementUpdate = (increments) => {
  const update = {};
  Object.entries(increments || {}).forEach(([key, value]) => {
    if (typeof value === 'number' && value !== 0) {
      update[key] = FIELD.increment(value);
    }
  });
  update.updatedAt = new Date().toISOString();
  return update;
};

const incrementPlatformStats = async (increments) => {
  const update = buildIncrementUpdate(increments);
  if (!Object.keys(update).length) return;

  await db.collection('platformStats').doc(PLATFORM_DOC).set(update, { merge: true });
  invalidatePlatformStatsCache();
};

const incrementCollegeStats = async (collegeId, increments) => {
  if (!collegeId) return;
  const update = buildIncrementUpdate(increments);
  if (!Object.keys(update).length) return;

  await db.collection('collegeStats').doc(collegeId).set({
    collegeId,
    ...update,
  }, { merge: true });
  invalidateCollegeStatsCache(collegeId);
};

module.exports = {
  incrementPlatformStats,
  incrementCollegeStats,
};
