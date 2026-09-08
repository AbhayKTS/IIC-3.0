const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { clampArray, isValidUrl } = require('../utils/validation');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');
const { normalizeStudentProfile } = require('../utils/schema');
const { extractIdCardData, extractTextFromDocument } = require('../services/ocr.service');
const { parseResumeData } = require('../services/resumeParser.service');
const { logAudit } = require('../services/audit.service');
const { Roles } = require('../utils/roles');
const { triggerN8nWorkflow } = require('../services/n8n.service');

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

const fuzzyMatchCollege = (extracted, actual) => {
  if (!extracted || !actual) return false;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const c1 = clean(extracted);
  const c2 = clean(actual);

  if (c1.includes(c2) || c2.includes(c1)) return true;

  // Acronym check: e.g. "iit delhi" vs "indian institute of technology delhi"
  const getAcronym = (s) => s.split(' ').filter((w) => !['of', 'and', 'the', 'in'].includes(w)).map((w) => w[0]).join('');
  const a1 = getAcronym(c1);
  const a2 = getAcronym(c2);
  if (a1 && (c2.includes(a1) || a2.includes(a1) || a1.includes(a2))) return true;

  // Word token overlap
  const stopWords = ['and', 'the', 'for', 'college', 'institute', 'technology', 'university', 'of', 'in'];
  const words1 = new Set(c1.split(' ').filter((w) => w.length > 2 && !stopWords.includes(w)));
  const words2 = new Set(c2.split(' ').filter((w) => w.length > 2 && !stopWords.includes(w)));
  let matches = 0;
  words1.forEach((w) => {
    if (words2.has(w)) matches += 1;
  });
  return matches > 0;
};

const verifyIdCard = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!req.file || !req.file.buffer) {
      throw new CustomError('ID card image file is required', 400, 'file_required');
    }

    const ocrResult = await extractIdCardData(req.file.buffer, req.file.mimetype);

    // Fetch student's assigned college to verify college name match
    let actualCollegeName = null;
    let isCollegeMatched = false;

    if (actor.collegeId) {
      const collegeSnap = await db.collection('colleges').doc(actor.collegeId).get();
      if (collegeSnap.exists) {
        actualCollegeName = collegeSnap.data()?.name || null;
        if (actualCollegeName && ocrResult.collegeName) {
          isCollegeMatched = fuzzyMatchCollege(ocrResult.collegeName, actualCollegeName);
        }
      }
    }

    const idVerification = {
      status: 'pending_review',
      extractedData: {
        studentName: ocrResult.studentName || null,
        rollNumber: ocrResult.rollNumber || null,
        collegeName: ocrResult.collegeName || null,
        validUntil: ocrResult.validUntil || null,
        rawFields: ocrResult.rawFields || {},
      },
      confidence: typeof ocrResult.confidence === 'number' ? ocrResult.confidence : 0,
      collegeMatch: {
        matched: isCollegeMatched,
        extractedCollegeName: ocrResult.collegeName || null,
        expectedCollegeName: actualCollegeName,
        mismatchFlagged: !isCollegeMatched,
      },
      source: ocrResult.source || 'azure-docint',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
    };

    await db.collection('users').doc(actor.uid).set({
      idVerification,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await logAudit({
      actionType: 'id_card_ocr_submitted',
      performedBy: actor.uid,
      performedByRole: actor.role || 'student',
      targetId: actor.uid,
      targetType: 'user',
      collegeId: actor.collegeId || null,
      metadata: {
        confidence: idVerification.confidence,
        ocrSuccess: ocrResult.success,
        collegeMatched: isCollegeMatched,
        source: idVerification.source,
      },
    });

    return ok(res, {
      idVerification,
      message: 'ID card submitted for faculty verification',
    });
  } catch (error) {
    return next(error);
  }
};

const parseResume = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!req.file || !req.file.buffer) {
      throw new CustomError('Resume file is required', 400, 'file_required');
    }

    // 1. Extract raw text via Azure Document Intelligence prebuilt-read
    const ocrResult = await extractTextFromDocument(req.file.buffer, req.file.mimetype);
    if (!ocrResult.success || !ocrResult.text) {
      throw new CustomError(
        ocrResult.reason || 'Failed to extract text from resume',
        422,
        'resume_extraction_failed'
      );
    }

    // 2. Structure raw text into JSON via Azure OpenAI or rule-based fallback
    const parsedData = await parseResumeData(ocrResult.text);

    // 3. Merge extracted skills into student's existing skills array without overwriting
    const profileRef = db.collection('studentProfiles').doc(actor.uid);
    const profileSnap = await profileRef.get();
    const userRef = db.collection('users').doc(actor.uid);
    const userSnap = await userRef.get();

    const existingSkills = profileSnap.exists && Array.isArray(profileSnap.data()?.skills)
      ? profileSnap.data().skills
      : (userSnap.exists && Array.isArray(userSnap.data()?.skills) ? userSnap.data().skills : []);

    const extractedSkillNames = (parsedData.skills || [])
      .map((s) => (typeof s === 'string' ? s : s.name))
      .filter(Boolean);

    const existingLower = new Set(existingSkills.map((s) => s.toLowerCase()));
    const newSkillsAdded = [];

    for (const skillName of extractedSkillNames) {
      if (!existingLower.has(skillName.toLowerCase())) {
        existingLower.add(skillName.toLowerCase());
        newSkillsAdded.push(skillName);
      }
    }

    const mergedSkills = [...existingSkills, ...newSkillsAdded];
    const now = new Date().toISOString();

    const resumeExtraction = {
      ...parsedData,
      extractedAt: now,
      method: parsedData.method,
    };

    // Store resumeExtraction and merged skills on user doc
    await userRef.set({
      skills: mergedSkills,
      resumeExtraction,
      updatedAt: now,
    }, { merge: true });

    // Update profile doc if present
    if (profileSnap.exists) {
      await profileRef.set({
        skills: mergedSkills,
        updatedAt: now,
      }, { merge: true });

      const searchableSkills = buildSearchableSkills(mergedSkills);
      await db.collection('studentLeaderboard').doc(actor.uid).set({
        searchableSkills,
        updatedAt: now,
      }, { merge: true });
    }

    // 4. Audit log
    await logAudit({
      actionType: 'resume_parsed',
      performedBy: actor.uid,
      performedByRole: actor.role || 'student',
      targetId: actor.uid,
      targetType: 'user',
      collegeId: actor.collegeId || null,
      metadata: {
        method: parsedData.method,
        skillsCount: (parsedData.skills || []).length,
        newSkillsAddedCount: newSkillsAdded.length,
      },
    });

    // Trigger n8n workflow for resume parsing and job matching (non-blocking)
    triggerN8nWorkflow('resume_parsed', {
      studentId: actor.uid,
      collegeId: actor.collegeId || null,
      skills: mergedSkills,
      extractedSkills: extractedSkillNames,
      candidateName: parsedData.candidateName || null,
      email: parsedData.email || actor.email || null,
      method: parsedData.method,
      timestamp: now,
    }).catch(() => undefined);

    return ok(res, {
      resumeData: parsedData,
      mergedSkills,
      newSkillsAdded,
      message: 'Resume parsed and skills merged successfully',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getStudentOverview,
  getStudentProfile,
  createStudentProfile,
  updateStudentProfile,
  verifyIdCard,
  parseResume,
};
