const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { createNotification } = require('../services/notifications.service');
const { addStudentToCollegeCommunity } = require('../services/communities.service');
const { getLatestSnapshot, getCollegeStats } = require('../services/analytics.service');
const { logAudit } = require('../services/audit.service');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');
const { normalizeStudentProfile } = require('../utils/schema');

const listPendingStudents = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    const snapshot = await db
      .collection('users')
      .where('role', '==', Roles.STUDENT)
      .where('collegeId', '==', actor.collegeId)
      .where('verificationStatus', '==', 'pending')
      .get();

    const students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return ok(res, { students });
  } catch (error) {
    return next(error);
  }
};

const verifyStudent = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    const { studentId, status } = req.body || {};

    if (!studentId || !['verified', 'rejected'].includes(status)) {
      throw new CustomError('studentId and valid status are required', 400, 'invalid_payload');
    }

    const studentRef = db.collection('users').doc(studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      throw new CustomError('Student not found', 404, 'student_missing');
    }

    const student = studentSnap.data();

    if (student.role !== Roles.STUDENT) {
      throw new CustomError('Target user is not a student', 400, 'invalid_target');
    }

    if (student.collegeId !== actor.collegeId) {
      throw new CustomError('Cross-college verification forbidden', 403, 'college_mismatch');
    }

    const update = {
      verificationStatus: status,
      verifiedBy: actor.uid,
      verificationTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await studentRef.set(update, { merge: true });

    await logAudit({
      actionType: 'student_verification',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: studentId,
      targetType: 'user',
      collegeId: actor.collegeId,
      metadata: { status },
    });

    if (status === 'verified' && student.verificationStatus !== 'verified') {
      await incrementPlatformStats({ totalVerifiedStudents: 1 });
      await incrementCollegeStats(actor.collegeId, { totalVerifiedStudents: 1 });
    }

    await createNotification({
      userId: studentId,
      type: 'verification',
      title: status === 'verified' ? 'Student verified' : 'Student verification rejected',
      message: status === 'verified'
        ? 'Your account has been verified by your college.'
        : 'Your verification request was rejected. Please contact your faculty.',
      referenceId: studentId,
    });

    if (status === 'verified') {
      await addStudentToCollegeCommunity({
        userId: studentId,
        collegeId: student.collegeId,
      });

      await db.collection('studentLeaderboard').doc(studentId).set({
        isVerified: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    if (status === 'rejected') {
      await db.collection('studentLeaderboard').doc(studentId).set({
        isVerified: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return ok(res, { studentId, verificationStatus: status });
  } catch (error) {
    return next(error);
  }
};

const getStudentProfileForFaculty = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const studentId = req.params.id;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    if (!studentId) {
      throw new CustomError('Student id is required', 400, 'invalid_payload');
    }

    const userSnap = await db.collection('users').doc(studentId).get();

    if (!userSnap.exists) {
      throw new CustomError('Student not found', 404, 'student_missing');
    }

    const user = userSnap.data();

    if (user.role !== Roles.STUDENT) {
      throw new CustomError('Target user is not a student', 400, 'invalid_target');
    }

    if (user.collegeId !== actor.collegeId) {
      throw new CustomError('Cross-college access forbidden', 403, 'college_mismatch');
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

const getCollegeAnalytics = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    const stats = await getCollegeStats(actor.collegeId);

    return ok(res, { stats });
  } catch (error) {
    return next(error);
  }
};

const getCollegeAuditLogs = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const { actionType, performedBy, startDate, endDate, limit, cursor } = req.query || {};

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    let query = db
      .collection('auditLogs')
      .where('collegeId', '==', actor.collegeId)
      .orderBy('createdAt', 'desc');

    if (actionType) {
      query = query.where('actionType', '==', actionType);
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
  listPendingStudents,
  verifyStudent,
  getStudentProfileForFaculty,
  getCollegeAnalytics,
  getCollegeAuditLogs,
};
