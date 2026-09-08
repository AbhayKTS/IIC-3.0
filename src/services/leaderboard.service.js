const db = require('./firestore');
const CustomError = require('../utils/CustomError');
const { logAudit } = require('./audit.service');
const { incrementPlatformStats, incrementCollegeStats } = require('./stats.service');
const { LRUCache } = require('../utils/cache');
const { recordSlowQuery } = require('./metrics.service');

const CATEGORY_KEYS = ['academic', 'sports', 'cultural'];
const leaderboardCache = new LRUCache(1);

const normalizeCategoryScores = (scores) => {
  const base = { academic: 0, sports: 0, cultural: 0 };
  return { ...base, ...(scores || {}) };
};

const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  return skills.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean);
};

const sumScores = (scores) => {
  return CATEGORY_KEYS.reduce((total, key) => total + (scores[key] || 0), 0);
};

const updateStudentScore = async (userId, category, points) => {
  if (!CATEGORY_KEYS.includes(category)) {
    throw new CustomError('Invalid leaderboard category', 400, 'invalid_category');
  }

  if (typeof points !== 'number') {
    throw new CustomError('Points must be a number', 400, 'invalid_points');
  }

  const studentProfileRef = db.collection('studentProfiles').doc(userId);
  const studentLeaderboardRef = db.collection('studentLeaderboard').doc(userId);

  let collegeId;

  let isNewLeaderboardEntry = false;

  await db.runTransaction(async (transaction) => {
    const profileSnap = await transaction.get(studentProfileRef);
    const leaderboardSnap = await transaction.get(studentLeaderboardRef);

    if (!profileSnap.exists) {
      throw new CustomError('Student profile not found', 404, 'profile_missing');
    }

    const profile = profileSnap.data();
    collegeId = profile.collegeId || null;

    if (!collegeId) {
      throw new CustomError('Student college missing', 400, 'college_missing');
    }

    const currentScores = normalizeCategoryScores(profile.categoryScores);
    currentScores[category] = (currentScores[category] || 0) + points;

    const totalScore = sumScores(currentScores);

    transaction.set(studentProfileRef, {
      categoryScores: currentScores,
      totalScore,
      overallScore: totalScore,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const searchableSkills = normalizeSkills(profile.skills);

    transaction.set(studentLeaderboardRef, {
      userId,
      collegeId,
      categoryScores: currentScores,
      totalScore,
      overallScore: totalScore,
      searchableSkills,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (!leaderboardSnap.exists) {
      isNewLeaderboardEntry = true;
    }
  });

  await recalculateCollegeLeaderboard(collegeId);

  await incrementPlatformStats({
    totalScoreSum: points,
    totalScoreCount: isNewLeaderboardEntry ? 1 : 0,
  });
  await incrementCollegeStats(collegeId, {
    totalScoreSum: points,
    totalScoreCount: isNewLeaderboardEntry ? 1 : 0,
  });
  leaderboardCache.clear();

  await logAudit({
    actionType: 'score_update',
    performedBy: 'system',
    performedByRole: 'system',
    targetId: userId,
    targetType: 'leaderboard',
    collegeId,
    metadata: { category, points },
  });

  return { userId, collegeId };
};

const recalculateCollegeLeaderboard = async (collegeId) => {
  const snapshot = await db
    .collection('studentLeaderboard')
    .where('collegeId', '==', collegeId)
    .get();

  let totalScore = 0;
  let totalStudents = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalScore += data.totalScore || 0;
    totalStudents += 1;
  });

  const averageScore = totalStudents ? totalScore / totalStudents : 0;

  await db.collection('collegeLeaderboard').doc(collegeId).set({
    collegeId,
    totalCollegeScore: totalScore,
    totalStudents,
    averageScore,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

const recalculateRankings = async () => {
  const studentSnap = await db
    .collection('studentLeaderboard')
    .orderBy('totalScore', 'desc')
    .get();

  const studentDocs = studentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const collegeBuckets = new Map();

  studentDocs.forEach((student, index) => {
    const rankNational = index + 1;
    student.rankNational = rankNational;

    if (!collegeBuckets.has(student.collegeId)) {
      collegeBuckets.set(student.collegeId, []);
    }
    collegeBuckets.get(student.collegeId).push(student);
  });

  collegeBuckets.forEach((students) => {
    students.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    students.forEach((student, index) => {
      student.rankCollege = index + 1;
    });
  });

  const batchSize = 400;
  for (let i = 0; i < studentDocs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = studentDocs.slice(i, i + batchSize);

    chunk.forEach((student) => {
      const ref = db.collection('studentLeaderboard').doc(student.userId || student.id);
      batch.set(ref, {
        rankNational: student.rankNational,
        rankCollege: student.rankCollege,
        cachedRank: student.rankNational,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    await batch.commit();
  }

  const collegeSnap = await db
    .collection('collegeLeaderboard')
    .orderBy('totalCollegeScore', 'desc')
    .get();

  const collegeDocs = collegeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  for (let i = 0; i < collegeDocs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = collegeDocs.slice(i, i + batchSize);

    chunk.forEach((college, index) => {
      const rankNational = i + index + 1;
      const ref = db.collection('collegeLeaderboard').doc(college.collegeId || college.id);
      batch.set(ref, { rankNational, updatedAt: new Date().toISOString() }, { merge: true });
    });

    await batch.commit();
  }

  return { studentsRanked: studentDocs.length, collegesRanked: collegeDocs.length };
};

const getTopLeaderboard = async () => {
  const cached = leaderboardCache.get('top50');
  if (cached) return cached;

  const queryStart = Date.now();
  const snapshot = await db
    .collection('studentLeaderboard')
    .orderBy('totalScore', 'desc')
    .limit(50)
    .get();
  recordSlowQuery({
    label: 'leaderboard_top50',
    durationMs: Date.now() - queryStart,
    meta: { route: '/leaderboard/top' },
  });

  const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  leaderboardCache.set('top50', results);
  return results;
};

module.exports = {
  updateStudentScore,
  recalculateRankings,
  getTopLeaderboard,
};
