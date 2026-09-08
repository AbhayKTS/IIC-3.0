const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { clampArray, isValidUrl } = require('../utils/validation');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');
const { normalizeStudentProfile } = require('../utils/schema');

const PROFILE_LIMITS = {
  skills: 30,
  softSkills: 20,
  projects: 15,
  experience: 15,
  certifications: 20,
};

const sanitizeProfilePayload = (payload) => {
  const codingProfiles = payload.codingProfiles || {};

  return {
    enrollmentYear: payload.enrollmentYear || null,
    branch: payload.branch || null,
    bio: payload.bio || null,
    skills: clampArray(payload.skills, PROFILE_LIMITS.skills),
    softSkills: clampArray(payload.softSkills, PROFILE_LIMITS.softSkills),
    codingProfiles: {
      github: isValidUrl(codingProfiles.github) ? codingProfiles.github : null,
      leetcode: isValidUrl(codingProfiles.leetcode) ? codingProfiles.leetcode : null,
      codeforces: isValidUrl(codingProfiles.codeforces) ? codingProfiles.codeforces : null,
      codechef: isValidUrl(codingProfiles.codechef) ? codingProfiles.codechef : null,
      linkedin: isValidUrl(codingProfiles.linkedin) ? codingProfiles.linkedin : null,
    },
    education: Array.isArray(payload.education) ? payload.education : [],
    projects: clampArray(payload.projects, PROFILE_LIMITS.projects),
    experience: clampArray(payload.experience, PROFILE_LIMITS.experience),
    certifications: clampArray(payload.certifications, PROFILE_LIMITS.certifications),
    profileVisibility: payload.profileVisibility === 'collegeOnly' ? 'collegeOnly' : 'public',
  };
};

const buildSearchableSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  return skills.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean);
};

const getStudentOverview = (req, res) => {
  return ok(res, {
    uid: req.userProfile.uid,
    role: req.userProfile.role,
    verificationStatus: req.userProfile.verificationStatus,
  });
};

const getStudentProfile = async (req, res, next) => {
  try {
    const userId = req.userProfile.uid;
    const profileRef = db.collection('studentProfiles').doc(userId);
    const snapshot = await profileRef.get();

    if (!snapshot.exists) {
      throw new CustomError('Student profile not found', 404, 'profile_missing');
    }

    return ok(res, { profile: normalizeStudentProfile(snapshot.data()) });
  } catch (error) {
    return next(error);
  }
};

const createStudentProfile = async (req, res, next) => {
  try {
    const userId = req.userProfile.uid;
    const profileRef = db.collection('studentProfiles').doc(userId);
    const existing = await profileRef.get();

    if (existing.exists) {
      throw new CustomError('Profile already exists', 409, 'profile_exists');
    }

    const profilePayload = sanitizeProfilePayload(req.body || {});

    const profileDoc = {
      userId,
      collegeId: req.userProfile.collegeId,
      schemaVersion: 1,
      achievementsCount: 0,
      leaderboardScore: 0,
      categoryScores: {
        academic: 0,
        sports: 0,
        cultural: 0,
      },
      totalScore: 0,
      overallScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...profilePayload,
    };

    await profileRef.set(profileDoc);

    const searchableSkills = buildSearchableSkills(profileDoc.skills);
    await db.collection('studentLeaderboard').doc(userId).set({
      userId,
      collegeId: req.userProfile.collegeId,
      schemaVersion: 1,
      totalScore: profileDoc.totalScore,
      overallScore: profileDoc.overallScore,
      categoryScores: profileDoc.categoryScores,
      searchableSkills,
      isVerified: req.userProfile.verificationStatus === 'verified',
      cachedRank: null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await incrementPlatformStats({ totalScoreCount: 1 });
    await incrementCollegeStats(req.userProfile.collegeId, { totalScoreCount: 1 });
    return ok(res, { profile: profileDoc });
  } catch (error) {
    return next(error);
  }
};

const updateStudentProfile = async (req, res, next) => {
  try {
    const userId = req.userProfile.uid;
    const profileRef = db.collection('studentProfiles').doc(userId);
    const snapshot = await profileRef.get();

    if (!snapshot.exists) {
      throw new CustomError('Student profile not found', 404, 'profile_missing');
    }

    const profilePayload = sanitizeProfilePayload(req.body || {});

    const update = {
      ...profilePayload,
      updatedAt: new Date().toISOString(),
    };

    await profileRef.set(update, { merge: true });
    const updated = await profileRef.get();
    const updatedProfile = updated.data() || {};
    const searchableSkills = buildSearchableSkills(updatedProfile.skills);
    await db.collection('studentLeaderboard').doc(userId).set({
      searchableSkills,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return ok(res, { profile: normalizeStudentProfile(updated.data()) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudentOverview,
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
};
