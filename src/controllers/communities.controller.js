const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString } = require('../utils/validation');
const { logAudit } = require('../services/audit.service');

const COMMUNITY_TYPES = ['college', 'department', 'custom'];
const COMMUNITY_VISIBILITY = ['public', 'collegeOnly', 'private'];

const buildCommunityPayload = (payload) => {
  return {
    name: isNonEmptyString(payload.name) ? payload.name.trim() : null,
    description: isNonEmptyString(payload.description) ? payload.description.trim() : null,
    type: COMMUNITY_TYPES.includes(payload.type) ? payload.type : null,
    visibility: COMMUNITY_VISIBILITY.includes(payload.visibility) ? payload.visibility : null,
  };
};

const createFacultyCommunity = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Faculty college missing', 400, 'college_missing');
    }

    const payload = buildCommunityPayload(req.body || {});

    if (!payload.name || !payload.description || !payload.type) {
      throw new CustomError('name, description, and type are required', 400, 'invalid_payload');
    }

    if (!['college', 'department'].includes(payload.type)) {
      throw new CustomError('Only college or department communities allowed', 400, 'invalid_payload');
    }

    if (payload.type === 'college') {
      const existing = await db
        .collection('communities')
        .where('collegeId', '==', actor.collegeId)
        .where('type', '==', 'college')
        .limit(1)
        .get();

      if (!existing.empty) {
        throw new CustomError('College community already exists', 409, 'community_duplicate');
      }
    }

    const communityRef = db.collection('communities').doc();
    const now = new Date().toISOString();

    const communityDoc = {
      communityId: communityRef.id,
      collegeId: actor.collegeId,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      createdBy: actor.uid,
      visibility: payload.visibility || 'collegeOnly',
      membersCount: 0,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    await communityRef.set(communityDoc);

    await logAudit({
      actionType: 'community_created',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: communityRef.id,
      targetType: 'community',
      collegeId: actor.collegeId,
      metadata: { type: payload.type },
    });

    return ok(res, { community: communityDoc });
  } catch (error) {
    return next(error);
  }
};

const createStudentCommunity = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Student college missing', 400, 'college_missing');
    }

    const payload = buildCommunityPayload(req.body || {});

    if (!payload.name || !payload.description) {
      throw new CustomError('name and description are required', 400, 'invalid_payload');
    }

    const communityRef = db.collection('communities').doc();
    const now = new Date().toISOString();

    const communityDoc = {
      communityId: communityRef.id,
      collegeId: actor.collegeId,
      name: payload.name,
      description: payload.description,
      type: 'custom',
      createdBy: actor.uid,
      visibility: payload.visibility || 'collegeOnly',
      membersCount: 1,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    const memberRef = db.collection('communityMembers').doc(`${communityRef.id}_${actor.uid}`);

    await db.runTransaction(async (transaction) => {
      transaction.set(communityRef, communityDoc);
      transaction.set(memberRef, {
        communityId: communityRef.id,
        userId: actor.uid,
        role: 'admin',
        joinedAt: now,
      });
    });

    await logAudit({
      actionType: 'community_created',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: communityRef.id,
      targetType: 'community',
      collegeId: actor.collegeId,
      metadata: { type: 'custom' },
    });

    return ok(res, { community: communityDoc });
  } catch (error) {
    return next(error);
  }
};

const joinCommunity = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const communityId = req.params.communityId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Student college missing', 400, 'college_missing');
    }

    if (!communityId) {
      throw new CustomError('Community id is required', 400, 'invalid_payload');
    }

    const communityRef = db.collection('communities').doc(communityId);
    const memberRef = db.collection('communityMembers').doc(`${communityId}_${actor.uid}`);

    await db.runTransaction(async (transaction) => {
      const communitySnap = await transaction.get(communityRef);
      const memberSnap = await transaction.get(memberRef);

      if (!communitySnap.exists) {
        throw new CustomError('Community not found', 404, 'community_missing');
      }

      const community = communitySnap.data();

      if (community.type === 'college') {
        throw new CustomError('College community is auto-joined', 403, 'community_auto');
      }

      if (community.visibility === 'private') {
        throw new CustomError('Private community requires approval', 403, 'community_private');
      }

      if (community.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college join forbidden', 403, 'college_mismatch');
      }

      if (memberSnap.exists) {
        throw new CustomError('Already a community member', 409, 'already_member');
      }

      const currentCount = community.membersCount || 0;

      transaction.set(memberRef, {
        communityId,
        userId: actor.uid,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });

      transaction.set(communityRef, {
        membersCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { communityId, joined: true });
  } catch (error) {
    return next(error);
  }
};

const leaveCommunity = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const communityId = req.params.communityId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!communityId) {
      throw new CustomError('Community id is required', 400, 'invalid_payload');
    }

    const communityRef = db.collection('communities').doc(communityId);
    const memberRef = db.collection('communityMembers').doc(`${communityId}_${actor.uid}`);

    await db.runTransaction(async (transaction) => {
      const communitySnap = await transaction.get(communityRef);
      const memberSnap = await transaction.get(memberRef);

      if (!communitySnap.exists) {
        throw new CustomError('Community not found', 404, 'community_missing');
      }

      if (!memberSnap.exists) {
        throw new CustomError('Membership not found', 404, 'membership_missing');
      }

      const community = communitySnap.data();
      const member = memberSnap.data();

      if (community.type === 'college') {
        throw new CustomError('Cannot leave college community', 403, 'community_mandatory');
      }

      if (member.role === 'admin') {
        throw new CustomError('Admin cannot leave community', 403, 'admin_cannot_leave');
      }

      const nextCount = Math.max((community.membersCount || 0) - 1, 0);

      transaction.delete(memberRef);
      transaction.set(communityRef, {
        membersCount: nextCount,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { communityId, left: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createFacultyCommunity,
  createStudentCommunity,
  joinCommunity,
  leaveCommunity,
};
