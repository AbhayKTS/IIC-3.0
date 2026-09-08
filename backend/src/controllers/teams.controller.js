const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString } = require('../utils/validation');
const { createNotification } = require('../services/notifications.service');
const { logAudit } = require('../services/audit.service');

const buildTeamPayload = (payload) => {
  const maxMembers = Number.isFinite(payload.maxMembers)
    ? payload.maxMembers
    : payload.maxMembers ? Number(payload.maxMembers) : null;

  return {
    teamName: isNonEmptyString(payload.teamName) ? payload.teamName.trim() : null,
    maxMembers: Number.isFinite(maxMembers) ? maxMembers : null,
  };
};

const createTeam = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const eventId = req.params.eventId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!eventId) {
      throw new CustomError('Event id is required', 400, 'invalid_payload');
    }

    const payload = buildTeamPayload(req.body || {});

    if (!payload.teamName) {
      throw new CustomError('teamName is required', 400, 'invalid_payload');
    }

    if (!payload.maxMembers || payload.maxMembers < 2) {
      throw new CustomError('maxMembers must be at least 2', 400, 'invalid_payload');
    }

    const eventRef = db.collection('events').doc(eventId);
    const teamRef = db.collection('teams').doc();
    const memberRef = db.collection('teamMembers').doc(`${teamRef.id}_${actor.uid}`);

    let approvedUserId = null;

    await db.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists) {
        throw new CustomError('Event not found', 404, 'event_missing');
      }

      const event = eventSnap.data();

      if (!event.isTeamEvent) {
        throw new CustomError('Event is not team-based', 403, 'event_not_team');
      }

      if (event.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college team creation forbidden', 403, 'college_mismatch');
      }

      const membershipQuery = db
        .collection('teamMembers')
        .where('eventId', '==', eventId)
        .where('userId', '==', actor.uid)
        .limit(1);

      const membershipSnap = await transaction.get(membershipQuery);

      if (!membershipSnap.empty) {
        throw new CustomError('Already in a team for this event', 409, 'already_in_team');
      }

      const now = new Date().toISOString();
      const teamDoc = {
        teamId: teamRef.id,
        eventId,
        collegeId: actor.collegeId,
        teamName: payload.teamName,
        createdBy: actor.uid,
        maxMembers: payload.maxMembers,
        currentMembersCount: 1,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(teamRef, teamDoc);
      transaction.set(memberRef, {
        teamId: teamRef.id,
        eventId,
        userId: actor.uid,
        role: 'leader',
        joinedAt: now,
      });
    });

    return ok(res, { teamId: teamRef.id, created: true });
  } catch (error) {
    return next(error);
  }
};

const requestJoinTeam = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const teamId = req.params.teamId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!teamId) {
      throw new CustomError('Team id is required', 400, 'invalid_payload');
    }

    const teamRef = db.collection('teams').doc(teamId);
    const requestId = `${teamId}_${actor.uid}`;
    const requestRef = db.collection('teamJoinRequests').doc(requestId);

    await db.runTransaction(async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const requestSnap = await transaction.get(requestRef);

      if (!teamSnap.exists) {
        throw new CustomError('Team not found', 404, 'team_missing');
      }

      const team = teamSnap.data();

      if (team.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college request forbidden', 403, 'college_mismatch');
      }

      if (team.status !== 'open') {
        throw new CustomError('Team is not accepting requests', 403, 'team_closed');
      }

      if (team.maxMembers && team.currentMembersCount >= team.maxMembers) {
        throw new CustomError('Team is full', 403, 'team_full');
      }

      if (requestSnap.exists && requestSnap.data().status === 'pending') {
        throw new CustomError('Join request already pending', 409, 'request_pending');
      }

      const membershipQuery = db
        .collection('teamMembers')
        .where('eventId', '==', team.eventId)
        .where('userId', '==', actor.uid)
        .limit(1);

      const membershipSnap = await transaction.get(membershipQuery);

      if (!membershipSnap.empty) {
        throw new CustomError('Already in a team for this event', 409, 'already_in_team');
      }

      transaction.set(requestRef, {
        requestId,
        teamId,
        eventId: team.eventId,
        userId: actor.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { teamId, requested: true });
  } catch (error) {
    return next(error);
  }
};

const approveJoinRequest = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const teamId = req.params.teamId;
    const requestId = req.params.requestId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!teamId || !requestId) {
      throw new CustomError('Team id and request id are required', 400, 'invalid_payload');
    }

    const teamRef = db.collection('teams').doc(teamId);
    const requestRef = db.collection('teamJoinRequests').doc(requestId);

    await db.runTransaction(async (transaction) => {
      const teamSnap = await transaction.get(teamRef);
      const requestSnap = await transaction.get(requestRef);

      if (!teamSnap.exists) {
        throw new CustomError('Team not found', 404, 'team_missing');
      }

      const team = teamSnap.data();

      if (team.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college approval forbidden', 403, 'college_mismatch');
      }

      if (!requestSnap.exists) {
        throw new CustomError('Join request not found', 404, 'request_missing');
      }

      const request = requestSnap.data();
      approvedUserId = request.userId;

      if (request.status !== 'pending') {
        throw new CustomError('Join request already processed', 409, 'request_processed');
      }

      if (request.teamId !== teamId || request.eventId !== team.eventId) {
        throw new CustomError('Join request does not match team', 400, 'request_mismatch');
      }

      const leaderQuery = db
        .collection('teamMembers')
        .where('teamId', '==', teamId)
        .where('userId', '==', actor.uid)
        .where('role', '==', 'leader')
        .limit(1);

      const leaderSnap = await transaction.get(leaderQuery);

      if (leaderSnap.empty) {
        throw new CustomError('Only team leader can approve', 403, 'leader_only');
      }

      const currentCount = team.currentMembersCount || 0;
      if (team.maxMembers && currentCount >= team.maxMembers) {
        throw new CustomError('Team is full', 403, 'team_full');
      }

      const membershipRef = db.collection('teamMembers').doc(`${teamId}_${request.userId}`);

      transaction.set(membershipRef, {
        teamId,
        eventId: team.eventId,
        userId: request.userId,
        role: 'member',
        joinedAt: new Date().toISOString(),
      }, { merge: true });

      const nextCount = currentCount + 1;
      const nextStatus = team.maxMembers && nextCount >= team.maxMembers ? 'full' : 'open';

      transaction.set(teamRef, {
        currentMembersCount: nextCount,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      transaction.set(requestRef, {
        status: 'approved',
      }, { merge: true });
    });

    if (approvedUserId) {
      await createNotification({
        userId: approvedUserId,
        type: 'team',
        title: 'Team request approved',
        message: 'Your request to join the team has been approved.',
        referenceId: teamId,
      });

      await logAudit({
        actionType: 'team_approval',
        performedBy: actor.uid,
        performedByRole: actor.role,
        targetId: teamId,
        targetType: 'team',
        collegeId: actor.collegeId,
        metadata: { approvedUserId },
      });
    }

    return ok(res, { teamId, approved: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTeam,
  requestJoinTeam,
  approveJoinRequest,
};
