const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles, FacultySubRoles } = require('../utils/roles');
const { recalculateRankings: recalculateLeaderboardRanks } = require('../services/leaderboard.service');
const {
  generateAnalyticsSnapshot,
  getLatestSnapshot,
  getPlatformStats,
} = require('../services/analytics.service');
const { logAudit } = require('../services/audit.service');
const { incrementPlatformStats } = require('../services/stats.service');

const getEmailDomain = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};

const createFaculty = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    const { uid, email, designation, department } = req.body || {};

    if (!uid || !email) {
      throw new CustomError('uid and email are required', 400, 'invalid_payload');
    }

    const collegeRef = db.collection('colleges').doc(actor.collegeId);
    const collegeSnap = await collegeRef.get();

    if (!collegeSnap.exists) {
      throw new CustomError('College not found', 404, 'college_missing');
    }

    const college = collegeSnap.data();
    const emailDomain = getEmailDomain(email);

    if (!college.domain || college.domain.toLowerCase() !== emailDomain) {
      throw new CustomError('Faculty email must match college domain', 400, 'domain_mismatch');
    }

    const existingUserSnap = await db.collection('users').doc(uid).get();

    const userDoc = {
      uid,
      email,
      role: Roles.FACULTY,
      subRole: FacultySubRoles.FACULTY,
      collegeId: actor.collegeId,
      verificationStatus: 'verified',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(uid).set(userDoc, { merge: true });

    if (!existingUserSnap.exists) {
      await incrementPlatformStats({ totalUsers: 1 });
    }

    const facultyProfile = {
      userId: uid,
      designation: designation || 'Faculty',
      department: department || 'General',
      permissionsLevel: FacultySubRoles.FACULTY,
    };

    await db.collection('facultyProfiles').doc(uid).set(facultyProfile, { merge: true });

    return ok(res, { uid, created: true });
  } catch (error) {
    return next(error);
  }
};

const recalculateRankings = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    const result = await recalculateLeaderboardRanks();
    await logAudit({
      actionType: 'leaderboard_recalculation',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetType: 'leaderboard',
      metadata: result,
    });
    return ok(res, result);
  } catch (error) {
    return next(error);
  }
};

const getPlatformAnalytics = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    const stats = await getPlatformStats();
    return ok(res, { stats });
  } catch (error) {
    return next(error);
  }
};

const generatePlatformAnalytics = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    const snapshot = await generateAnalyticsSnapshot({ snapshotType: 'platform' });
    await logAudit({
      actionType: 'admin_generate_analytics',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetType: 'system',
      metadata: { snapshotId: snapshot.snapshotId },
    });
    return ok(res, { snapshot });
  } catch (error) {
    return next(error);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const { targetUserId, role, subRole } = req.body || {};

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    if (!targetUserId || !role) {
      throw new CustomError('targetUserId and role are required', 400, 'invalid_payload');
    }

    if (targetUserId === actor.uid) {
      throw new CustomError('Self role change is not allowed', 403, 'self_change_forbidden');
    }

    const userRef = db.collection('users').doc(targetUserId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new CustomError('User not found', 404, 'user_missing');
    }

    const user = userSnap.data();

    if (user.collegeId && actor.collegeId && user.collegeId !== actor.collegeId) {
      throw new CustomError('Cross-college role changes forbidden', 403, 'college_mismatch');
    }

    const allowedRoles = [Roles.STUDENT, Roles.FACULTY, Roles.RECRUITER];
    if (!allowedRoles.includes(role)) {
      throw new CustomError('Invalid role', 400, 'invalid_role');
    }

    let nextSubRole = null;
    if (role === Roles.FACULTY) {
      nextSubRole = subRole || FacultySubRoles.FACULTY;
      if (![FacultySubRoles.ADMIN, FacultySubRoles.FACULTY].includes(nextSubRole)) {
        throw new CustomError('Invalid subRole', 400, 'invalid_subrole');
      }
    }

    await userRef.set({
      role,
      subRole: nextSubRole,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await logAudit({
      actionType: 'role_change',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: targetUserId,
      targetType: 'user',
      collegeId: user.collegeId || actor.collegeId || null,
      metadata: { role, subRole: nextSubRole },
    });

    return ok(res, { targetUserId, role, subRole: nextSubRole });
  } catch (error) {
    return next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const { actionType, collegeId, performedBy, startDate, endDate, limit, cursor } = req.query || {};

    if (!actor || actor.role !== Roles.FACULTY || actor.subRole !== FacultySubRoles.ADMIN) {
      throw new CustomError('Admin faculty only', 403, 'admin_only');
    }

    let query = db.collection('auditLogs').orderBy('createdAt', 'desc');

    if (actionType) {
      query = query.where('actionType', '==', actionType);
    }

    if (collegeId) {
      query = query.where('collegeId', '==', collegeId);
    }

    if (performedBy) {
      query = query.where('performedBy', '==', performedBy);
    }

    if (startDate) {
      query = query.where('createdAt', '>=', startDate);
    }

    if (endDate) {
      query = query.where('createdAt', '<=', endDate);
    }

    const limitValue = Math.min(Math.max(Number(limit) || 20, 1), 50);
    query = query.limit(limitValue);

    if (cursor) {
      const cursorSnap = await db.collection('auditLogs').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = snapshot.docs[snapshot.docs.length - 1]?.id || null;

    return ok(res, { logs, nextCursor });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createFaculty,
  recalculateRankings,
  getPlatformAnalytics,
  generatePlatformAnalytics,
  getAuditLogs,
  changeUserRole,
};
