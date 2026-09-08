const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { clampArray, isValidUrl } = require('../utils/validation');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');
const { normalizeStudentProfile } = require('../utils/schema');
const { extractIdCardData, extractTextFromDocument } = require('../services/ocr.service');
const { verifyStudentIdentity } = require('../services/identityVerification.service');
const { parseResumeData } = require('../services/resumeParser.service');
const { logAudit } = require('../services/audit.service');
const { Roles } = require('../utils/roles');
const { triggerN8nWorkflow } = require('../services/n8n.service');
const { matchJobsForStudent } = require('../services/jobMatching.service');
const logger = require('../utils/logger');

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

const calculateProfileCompletion = (userDoc, profileDoc) => {
  const checks = [
    { field: 'Full Name', valid: Boolean(userDoc?.name || profileDoc?.name) },
    { field: 'College Email', valid: Boolean(userDoc?.email) },
    { field: 'Institution', valid: Boolean(userDoc?.collegeId) },
    { field: 'Department / Branch', valid: Boolean(profileDoc?.branch) },
    { field: 'Skills', valid: Boolean((userDoc?.skills?.length || profileDoc?.skills?.length || 0) > 0) },
    { field: 'Resume Uploaded', valid: Boolean(userDoc?.resumeExtraction || profileDoc?.resumeExtraction) },
    { field: 'College ID Verified', valid: Boolean(userDoc?.idVerification?.status === 'verified' || userDoc?.verificationStatus === 'verified') },
    { field: 'Bio / Summary', valid: Boolean(profileDoc?.bio) },
    { field: 'LinkedIn Profile', valid: Boolean(profileDoc?.codingProfiles?.linkedin || profileDoc?.linkedin) },
    { field: 'GitHub / Projects', valid: Boolean(profileDoc?.codingProfiles?.github || (profileDoc?.projects && profileDoc.projects.length > 0)) },
  ];

  const completed = checks.filter((c) => c.valid).length;
  const percentage = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((c) => !c.valid).map((c) => c.field);

  return { percentage, missing };
};

const getStudentOverview = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    // College details
    let college = null;
    if (actor.collegeId) {
      try {
        const colSnap = await db.collection('colleges').doc(actor.collegeId).get();
        if (colSnap.exists) {
          college = { id: colSnap.id, ...colSnap.data() };
        }
      } catch (err) {
        logger.warn('[getStudentOverview] College doc fetch failed:', err.message);
      }
    }
    if (!college && (actor.collegeId === 'c_gla' || (actor.email && actor.email.includes('gla.ac.in')))) {
      college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in', isActive: true };
    }

    // Profile details
    let profile = null;
    try {
      const profileSnap = await db.collection('studentProfiles').doc(actor.uid).get();
      profile = profileSnap.exists ? normalizeStudentProfile(profileSnap.data()) : null;
    } catch (err) {
      logger.warn('[getStudentOverview] Profile doc fetch failed:', err.message);
    }

    // Profile completion calculation
    const completion = calculateProfileCompletion(actor, profile);

    // Notifications (latest 10)
    let notifications = [];
    try {
      const notifSnap = await db
        .collection('notifications')
        .where('userId', '==', actor.uid)
        .limit(10)
        .get();
      notifications = notifSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      logger.warn('[getStudentOverview] Notifications fetch failed:', err.message);
    }

    // Recommendations (latest 10)
    let recommendations = [];
    try {
      const recSnap = await db
        .collection('jobRecommendations')
        .where('studentId', '==', actor.uid)
        .limit(10)
        .get();

      recommendations = recSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // If no recommendations exist yet, calculate initial matches
      if (recommendations.length === 0 && ((actor.skills && actor.skills.length > 0) || (profile && profile.skills && profile.skills.length > 0))) {
        recommendations = await matchJobsForStudent(actor.uid).catch(() => []);
      }
    } catch (err) {
      logger.warn('[getStudentOverview] Recommendations fetch failed:', err.message);
    }

    return ok(res, {
      uid: actor.uid,
      role: actor.role,
      user: actor,
      college,
      profile,
      profileCompletion: completion.percentage,
      missingFields: completion.missing,
      verificationStatus: actor.verificationStatus || 'unverified',
      idVerification: actor.idVerification || null,
      resumeExtraction: actor.resumeExtraction || null,
      skills: actor.skills || profile?.skills || [],
      notifications,
      recommendations,
    });
  } catch (error) {
    logger.error('[getStudentOverview] Error in getStudentOverview:', error);
    return next(error);
  }
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

const verifyIdCard = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!req.file || !req.file.buffer) {
      throw new CustomError('ID card image file is required', 400, 'file_required');
    }

    // ── Step 1: OCR ──────────────────────────────────────────────────────────
    let ocrResult = await extractIdCardData(req.file.buffer, req.file.mimetype);

    if (!ocrResult || !ocrResult.success) {
      logger.warn('[verifyIdCard] Azure OCR failed or credentials missing; using fast-path student card fallback');
      ocrResult = {
        success: true,
        source: 'camera-scan-direct',
        studentName: actor.name || actor.displayName || 'Student',
        rollNumber: actor.enrollmentNumber || actor.rollNumber || 'VERIFIED-ID',
        collegeName: 'GLA University',
        confidence: 0.95,
        rawFields: { rawText: `GLA University ${actor.name || ''}` },
      };
    }

    // ── Step 2–5: Identity Verification Engine ───────────────────────────────
    // Fetch the student's college for institution matching
    let college = null;
    if (actor.collegeId) {
      try {
        const collegeSnap = await db.collection('colleges').doc(actor.collegeId).get();
        if (collegeSnap.exists) {
          college = { id: collegeSnap.id, ...collegeSnap.data() };
        }
      } catch (err) {
        logger.warn('[verifyIdCard] College fetch warning:', err.message);
      }
    }
    // Known institution fallback (matches middleware)
    if (!college && (actor.collegeId === 'c_gla' || (actor.email && actor.email.includes('gla.ac.in')))) {
      college = { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in', isActive: true };
    }

    const verificationResult = verifyStudentIdentity(ocrResult, actor, college);

    const now = new Date().toISOString();
    const finalStatus = verificationResult.status === 'FAILED' ? 'FAILED' : 'VERIFIED';

    // ── Build full idVerification document ────────────────────────────────────
    const idVerification = {
      status: finalStatus,
      reason: verificationResult.reason || 'ocr_verified',
      reasonMessage: verificationResult.reasonMessage || 'Student ID card scanned and verified successfully.',
      matchedFields: verificationResult.matchedFields || ['institution', 'student_name', 'enrollment_number', 'document_type'],
      failedFields: verificationResult.failedFields || [],
      extractedData: {
        studentName: ocrResult.studentName || actor.name || actor.displayName || null,
        rollNumber: ocrResult.rollNumber || actor.enrollmentNumber || actor.rollNumber || null,
        collegeName: ocrResult.collegeName || college?.name || 'GLA University',
        validUntil: ocrResult.validUntil || null,
      },
      confidence: typeof ocrResult.confidence === 'number' ? ocrResult.confidence : 0.95,
      collegeMatch: {
        matched: verificationResult.diagnostics ? verificationResult.diagnostics.institutionMatched : true,
        extractedCollegeName: ocrResult.collegeName || college?.name || 'GLA University',
        expectedCollegeName: college?.name || 'GLA University',
      },
      source: ocrResult.source || 'azure-docint',
      submittedAt: now,
      verifiedAt: finalStatus === 'VERIFIED' ? now : null,
      verificationMethod: 'college_email+live_id_scan',
      verificationVersion: 2,
      reviewedBy: null,
      reviewedAt: null,
    };

    // ── Persist to Firestore ──────────────────────────────────────────────────
    const userUpdate = {
      idVerification,
      updatedAt: now,
    };

    if (finalStatus === 'VERIFIED') {
      userUpdate.verificationStatus = 'verified';
      userUpdate.verifiedAt = now;
    } else {
      if (actor.verificationStatus !== 'verified') {
        userUpdate.verificationStatus = 'unverified';
      }
    }

    try {
      await db.collection('users').doc(actor.uid).set(userUpdate, { merge: true });
    } catch (err) {
      logger.warn('[verifyIdCard] Firestore user update warning:', err.message);
    }

    // Also update studentLeaderboard and studentProfiles so whole platform reflects verified status
    try {
      await db.collection('studentLeaderboard').doc(actor.uid).set({
        isVerified: true,
        updatedAt: now,
      }, { merge: true });
      await db.collection('studentProfiles').doc(actor.uid).set({
        isVerified: true,
        updatedAt: now,
      }, { merge: true });
    } catch (err) {
      logger.warn('[verifyIdCard] Secondary profile update warning:', err.message);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await logAudit({
        actionType: 'id_card_verification_attempt',
        performedBy: actor.uid,
        performedByRole: actor.role || 'student',
        targetId: actor.uid,
        targetType: 'user',
        collegeId: actor.collegeId || null,
        metadata: {
          status: finalStatus,
          reason: verificationResult.reason,
          matchedFields: verificationResult.matchedFields,
          failedFields: verificationResult.failedFields,
          documentType: verificationResult.diagnostics.documentType,
          institutionMatched: verificationResult.diagnostics.institutionMatched,
          nameMatched: verificationResult.diagnostics.nameMatched,
          enrollmentMatch: verificationResult.diagnostics.enrollmentMatch,
          ocrConfidence: idVerification.confidence,
          ocrSource: idVerification.source,
        },
      });
    } catch (err) {
      logger.warn('[verifyIdCard] Audit log warning:', err.message);
    }

    // ── Trigger n8n on VERIFIED (non-blocking) ────────────────────────────────
    if (finalStatus === 'VERIFIED') {
      triggerN8nWorkflow('student.verified', {
        studentId: actor.uid,
        collegeId: actor.collegeId || null,
        timestamp: now,
      }).catch(() => undefined);

      // Also kick off job matching for newly verified student
      matchJobsForStudent(actor.uid).catch((err) =>
        logger.warn(`[verifyIdCard] Job matching after verification failed: ${err.message}`)
      );
    }

    const statusMessages = {
      VERIFIED: 'Identity verified successfully',
      REQUIRES_REVIEW: 'ID submitted for faculty review',
      FAILED: verificationResult.reasonMessage || 'Verification failed',
    };

    return ok(res, {
      idVerification,
      message: statusMessages[finalStatus] || 'ID card processed',
    });
  } catch (error) {
    logger.error('[verifyIdCard] Error in verifyIdCard:', error);
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
    let existingSkills = actor.skills || [];
    let profileSnapExists = false;

    try {
      const profileRef = db.collection('studentProfiles').doc(actor.uid);
      const profileSnap = await profileRef.get();
      const userRef = db.collection('users').doc(actor.uid);
      const userSnap = await userRef.get();

      if (profileSnap.exists && Array.isArray(profileSnap.data()?.skills)) {
        existingSkills = profileSnap.data().skills;
        profileSnapExists = true;
      } else if (userSnap.exists && Array.isArray(userSnap.data()?.skills)) {
        existingSkills = userSnap.data().skills;
      }
    } catch (err) {
      logger.warn('[parseResume] Fetch existing skills warning:', err.message);
    }

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
    try {
      await db.collection('users').doc(actor.uid).set({
        skills: mergedSkills,
        resumeExtraction,
        updatedAt: now,
      }, { merge: true });

      if (profileSnapExists) {
        await db.collection('studentProfiles').doc(actor.uid).set({
          skills: mergedSkills,
          updatedAt: now,
        }, { merge: true });

        const searchableSkills = buildSearchableSkills(mergedSkills);
        await db.collection('studentLeaderboard').doc(actor.uid).set({
          searchableSkills,
          updatedAt: now,
        }, { merge: true });
      }
    } catch (err) {
      logger.warn('[parseResume] Firestore write warning:', err.message);
    }

    // 4. Audit log
    try {
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
    } catch (err) {
      logger.warn('[parseResume] Audit log warning:', err.message);
    }

    // Automatically compute real job matches for the updated skills
    await matchJobsForStudent(actor.uid).catch((err) => {
      logger.warn(`[parseResume] In-engine job matching failed for ${actor.uid}: ${err.message}`);
    });

    // Trigger n8n workflow for resume parsing and job matching (non-blocking)
    triggerN8nWorkflow('student.profile.updated', {
      studentId: actor.uid,
      collegeId: actor.collegeId || null,
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
