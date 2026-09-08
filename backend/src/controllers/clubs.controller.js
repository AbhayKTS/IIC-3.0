const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString } = require('../utils/validation');
const { createNotification } = require('../services/notifications.service');
const { logAudit } = require('../services/audit.service');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');

const CLUB_CATEGORIES = ['academic', 'sports', 'cultural', 'tech', 'other'];

const normalizeName = (name) => (isNonEmptyString(name) ? name.trim().toLowerCase() : '');

const buildClubPayload = (payload) => {
  return {
    name: isNonEmptyString(payload.name) ? payload.name.trim() : null,
    description: isNonEmptyString(payload.description) ? payload.description.trim() : null,
    category: CLUB_CATEGORIES.includes(payload.category) ? payload.category : null,
  };
};

const applyForClub = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Student college missing', 400, 'college_missing');
    }

    const payload = buildClubPayload(req.body || {});

    if (!payload.name || !payload.description || !payload.category) {
      throw new CustomError('name, description, and category are required', 400, 'invalid_payload');
    }

    const nameLower = normalizeName(payload.name);

    const duplicateSnap = await db
      .collection('clubs')
      .where('collegeId', '==', actor.collegeId)
      .where('nameLower', '==', nameLower)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      throw new CustomError('Club name already exists', 409, 'club_duplicate');
    }

    const clubRef = db.collection('clubs').doc();
    const now = new Date().toISOString();

    const clubDoc = {
      clubId: clubRef.id,
      collegeId: actor.collegeId,
      name: payload.name,
      nameLower,
      description: payload.description,
      category: payload.category,
      createdBy: actor.uid,
      approvedBy: null,
      status: 'pending',
      membersCount: 0,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    await clubRef.set(clubDoc);

    return ok(res, { club: clubDoc });
  } catch (error) {
    return next(error);
  }
};

const approveClub = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const clubId = req.params.clubId;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    if (!clubId) {
      throw new CustomError('Club id is required', 400, 'invalid_payload');
    }

    const clubRef = db.collection('clubs').doc(clubId);

    let creatorId = null;
    let clubName = null;

    await db.runTransaction(async (transaction) => {
      const clubSnap = await transaction.get(clubRef);

      if (!clubSnap.exists) {
        throw new CustomError('Club not found', 404, 'club_missing');
      }

      const club = clubSnap.data();
      creatorId = club.createdBy;
      clubName = club.name;

      if (club.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college approval forbidden', 403, 'college_mismatch');
      }

      if (club.status !== 'pending') {
        throw new CustomError('Club is not pending', 409, 'club_not_pending');
      }

      const now = new Date().toISOString();
      const memberRef = db.collection('clubMembers').doc(`${clubId}_${club.createdBy}`);

      transaction.set(clubRef, {
        status: 'approved',
        approvedBy: actor.uid,
        membersCount: 1,
        updatedAt: now,
      }, { merge: true });

      transaction.set(memberRef, {
        clubId,
        userId: club.createdBy,
        role: 'founder',
        joinedAt: now,
      }, { merge: true });
    });

    if (creatorId) {
      await createNotification({
        userId: creatorId,
        type: 'club',
        title: 'Club approved',
        message: `Your club "${clubName || 'Club'}" has been approved.`,
        referenceId: clubId,
      });

      await logAudit({
        actionType: 'club_approval',
        performedBy: actor.uid,
        performedByRole: actor.role,
        targetId: clubId,
        targetType: 'club',
        collegeId: actor.collegeId,
      });

      await incrementPlatformStats({ totalClubs: 1 });
      await incrementCollegeStats(actor.collegeId, { totalClubs: 1 });
    }

    return ok(res, { clubId, approved: true });
  } catch (error) {
    return next(error);
  }
};

const rejectClub = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const clubId = req.params.clubId;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    if (!clubId) {
      throw new CustomError('Club id is required', 400, 'invalid_payload');
    }

    const clubRef = db.collection('clubs').doc(clubId);
    const clubSnap = await clubRef.get();

    if (!clubSnap.exists) {
      throw new CustomError('Club not found', 404, 'club_missing');
    }

    const club = clubSnap.data();

    if (club.collegeId !== actor.collegeId) {
      throw new CustomError('Cross-college rejection forbidden', 403, 'college_mismatch');
    }

    if (club.status !== 'pending') {
      throw new CustomError('Club is not pending', 409, 'club_not_pending');
    }

    await clubRef.set({
      status: 'rejected',
      approvedBy: actor.uid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    await createNotification({
      userId: club.createdBy,
      type: 'club',
      title: 'Club rejected',
      message: `Your club "${club.name || 'Club'}" was rejected by faculty.`,
      referenceId: clubId,
    });

    await logAudit({
      actionType: 'club_rejection',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: clubId,
      targetType: 'club',
      collegeId: actor.collegeId,
    });

    return ok(res, { clubId, rejected: true });
  } catch (error) {
    return next(error);
  }
};

const joinClub = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const clubId = req.params.clubId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!clubId) {
      throw new CustomError('Club id is required', 400, 'invalid_payload');
    }

    const clubRef = db.collection('clubs').doc(clubId);
    const memberRef = db.collection('clubMembers').doc(`${clubId}_${actor.uid}`);

    await db.runTransaction(async (transaction) => {
      const clubSnap = await transaction.get(clubRef);
      const memberSnap = await transaction.get(memberRef);

      if (!clubSnap.exists) {
        throw new CustomError('Club not found', 404, 'club_missing');
      }

      const club = clubSnap.data();

      if (club.status !== 'approved') {
        throw new CustomError('Club is not approved', 403, 'club_not_approved');
      }

      if (club.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college join forbidden', 403, 'college_mismatch');
      }

      if (memberSnap.exists) {
        throw new CustomError('Already a club member', 409, 'already_member');
      }

      const currentCount = club.membersCount || 0;

      transaction.set(memberRef, {
        clubId,
        userId: actor.uid,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });

      transaction.set(clubRef, {
        membersCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { clubId, joined: true });
  } catch (error) {
    return next(error);
  }
};

const leaveClub = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const clubId = req.params.clubId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!clubId) {
      throw new CustomError('Club id is required', 400, 'invalid_payload');
    }

    const clubRef = db.collection('clubs').doc(clubId);
    const memberRef = db.collection('clubMembers').doc(`${clubId}_${actor.uid}`);

    await db.runTransaction(async (transaction) => {
      const clubSnap = await transaction.get(clubRef);
      const memberSnap = await transaction.get(memberRef);

      if (!clubSnap.exists) {
        throw new CustomError('Club not found', 404, 'club_missing');
      }

      if (!memberSnap.exists) {
        throw new CustomError('Membership not found', 404, 'membership_missing');
      }

      const member = memberSnap.data();

      if (member.role === 'founder') {
        throw new CustomError('Founder cannot leave club', 403, 'founder_cannot_leave');
      }

      const club = clubSnap.data();
      const nextCount = Math.max((club.membersCount || 0) - 1, 0);

      transaction.delete(memberRef);
      transaction.set(clubRef, {
        membersCount: nextCount,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { clubId, left: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  applyForClub,
  approveClub,
  rejectClub,
  joinClub,
  leaveClub,
};
