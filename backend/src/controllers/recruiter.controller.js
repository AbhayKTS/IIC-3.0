const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString } = require('../utils/validation');
const { normalizeStudentProfile, normalizeStudentLeaderboard } = require('../utils/schema');
const { recordSearchAbuse, recordSlowQuery } = require('../services/metrics.service');

const MAX_RESULTS = 50;
const DEFAULT_LIMIT = 20;
const CATEGORY_KEYS = ['academic', 'sports', 'cultural'];

const getStudentProfileForRecruiter = async (req, res, next) => {
  try {
    const studentId = req.params.id;

    if (!studentId) {
      throw new CustomError('Student id is required', 400, 'invalid_payload');
    }

    const userSnap = await db.collection('users').doc(studentId).get();

    if (!userSnap.exists) {
      throw new CustomError('Student not found', 404, 'student_missing');
    }

    const user = userSnap.data();

    if (user.role !== Roles.STUDENT || user.verificationStatus !== 'verified') {
      throw new CustomError('Student profile not available', 403, 'student_unverified');
    }

    const profileSnap = await db.collection('studentProfiles').doc(studentId).get();

    if (!profileSnap.exists) {
      throw new CustomError('Student profile not found', 404, 'profile_missing');
    }

    return ok(res, { profile: normalizeStudentProfile(profileSnap.data()) });
  } catch (error) {
    return next(error);
  }
};

const parseSkills = (skillsParam) => {
  if (!skillsParam) return [];
  if (Array.isArray(skillsParam)) {
    return skillsParam.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean);
  }
  return String(skillsParam)
    .split(',')
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
};

const searchStudents = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.RECRUITER) {
      throw new CustomError('Recruiter only', 403, 'recruiter_only');
    }

    const {
      skills,
      collegeId,
      minScore,
      category,
      sortBy,
      order,
      limit,
      cursor,
    } = req.query || {};

    const requestedSkills = parseSkills(skills);
    const hasCollegeFilter = collegeId && isNonEmptyString(collegeId);
    const hasMinScore = minScore !== undefined && minScore !== null && minScore !== '';

    if (!requestedSkills.length && !hasCollegeFilter && !hasMinScore) {
      recordSearchAbuse({ key: actor.uid || req.ip || 'unknown', reason: 'missing_filters' });
      throw new CustomError('At least one filter is required', 400, 'search_filter_required');
    }
    const requestedCategory = CATEGORY_KEYS.includes(category) ? category : null;
    const sortMode = sortBy === 'categoryScore' ? 'categoryScore' : 'totalScore';
    const sortField = sortMode === 'categoryScore'
      ? `categoryScores.${requestedCategory || 'academic'}`
      : 'totalScore';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const limitValue = Math.min(
      Math.max(Number(limit) || DEFAULT_LIMIT, 1),
      MAX_RESULTS
    );

    let query = db.collection('studentLeaderboard');

    if (hasCollegeFilter) {
      query = query.where('collegeId', '==', collegeId.trim());
    }

    if (hasMinScore) {
      const scoreValue = Number(minScore);
      if (Number.isNaN(scoreValue)) {
        throw new CustomError('minScore must be a number', 400, 'invalid_min_score');
      }
      query = query.where(sortField, '>=', scoreValue);
    }

    query = query.orderBy(sortField, sortOrder).limit(limitValue);

    if (cursor && isNonEmptyString(cursor)) {
      const cursorSnap = await db.collection('studentLeaderboard').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const queryStart = Date.now();
    const snapshot = await query.get();
    recordSlowQuery({
      label: 'recruiter_search',
      durationMs: Date.now() - queryStart,
      meta: { route: '/recruiter/search' },
    });

    if (snapshot.empty) {
      return ok(res, { results: [], nextCursor: null });
    }

    const leaderboardDocs = snapshot.docs.map((doc) => normalizeStudentLeaderboard({ id: doc.id, ...doc.data() }));
    const userIds = leaderboardDocs.map((doc) => doc.userId || doc.id).filter(Boolean);

    const profileRefs = userIds.map((id) => db.collection('studentProfiles').doc(id));
    const profileSnaps = await db.getAll(...profileRefs);

    const profileMap = new Map();
    profileSnaps.forEach((snap) => {
      if (snap.exists) profileMap.set(snap.id, snap.data());
    });

    const results = leaderboardDocs
      .filter((doc) => {
        return doc.isVerified === true;
      })
      .map((doc) => {
        const userId = doc.userId || doc.id;
        const profile = normalizeStudentProfile(profileMap.get(userId) || {});
        const skillsList = Array.isArray(profile.skills) ? profile.skills : [];
        const normalizedSkills = Array.isArray(doc.searchableSkills)
          ? doc.searchableSkills
          : skillsList.map((skill) => String(skill).toLowerCase());

        return {
          userId,
          fullName: profile.fullName || profile.name || null,
          collegeId: doc.collegeId || profile.collegeId || null,
          totalScore: doc.overallScore || doc.totalScore || 0,
          categoryScores: doc.categoryScores || { academic: 0, sports: 0, cultural: 0 },
          skills: skillsList,
          codingProfiles: profile.codingProfiles || {},
          leaderboardRank: doc.cachedRank || doc.rankNational || null,
          _normalizedSkills: normalizedSkills,
        };
      })
      .filter((entry) => {
        if (!requestedSkills.length) return true;
        return requestedSkills.every((skill) => entry._normalizedSkills.includes(skill));
      })
      .map(({ _normalizedSkills, ...rest }) => rest);

    const nextCursor = snapshot.docs[snapshot.docs.length - 1]?.id || null;

    return ok(res, { results, nextCursor });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudentProfileForRecruiter,
  searchStudents,
};
