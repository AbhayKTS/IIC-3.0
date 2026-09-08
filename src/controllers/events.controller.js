const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { Roles } = require('../utils/roles');
const { isNonEmptyString, isValidDateString } = require('../utils/validation');
const { createNotification } = require('../services/notifications.service');
const { logAudit } = require('../services/audit.service');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');

const EVENT_CATEGORIES = ['academic', 'sports', 'cultural'];
const EVENT_STATUSES = ['draft', 'open', 'closed', 'completed'];

const buildEventPayload = (payload) => {
  const maxParticipants = Number.isFinite(payload.maxParticipants)
    ? payload.maxParticipants
    : payload.maxParticipants ? Number(payload.maxParticipants) : null;

  const status = EVENT_STATUSES.includes(payload.status) ? payload.status : 'open';

  return {
    title: isNonEmptyString(payload.title) ? payload.title.trim() : null,
    description: isNonEmptyString(payload.description) ? payload.description.trim() : null,
    category: EVENT_CATEGORIES.includes(payload.category) ? payload.category : null,
    startDate: isValidDateString(payload.startDate) ? payload.startDate : null,
    endDate: isValidDateString(payload.endDate) ? payload.endDate : null,
    registrationDeadline: isValidDateString(payload.registrationDeadline)
      ? payload.registrationDeadline
      : null,
    maxParticipants: Number.isFinite(maxParticipants) ? maxParticipants : null,
    isTeamEvent: Boolean(payload.isTeamEvent),
    status,
  };
};

const createEvent = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || actor.role !== Roles.FACULTY) {
      throw new CustomError('Faculty only', 403, 'faculty_only');
    }

    if (!actor.collegeId) {
      throw new CustomError('Faculty college missing', 400, 'college_missing');
    }

    const payload = buildEventPayload(req.body || {});

    if (!payload.title || !payload.description || !payload.category) {
      throw new CustomError('title, description, and category are required', 400, 'invalid_payload');
    }

    if (!payload.startDate || !payload.endDate || !payload.registrationDeadline) {
      throw new CustomError('startDate, endDate, and registrationDeadline are required', 400, 'invalid_payload');
    }

    if (payload.maxParticipants !== null && payload.maxParticipants < 1) {
      throw new CustomError('maxParticipants must be at least 1', 400, 'invalid_payload');
    }

    const eventRef = db.collection('events').doc();
    const eventDoc = {
      eventId: eventRef.id,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      collegeId: actor.collegeId,
      createdBy: actor.uid,
      startDate: payload.startDate,
      endDate: payload.endDate,
      registrationDeadline: payload.registrationDeadline,
      maxParticipants: payload.maxParticipants,
      isTeamEvent: payload.isTeamEvent,
      status: payload.status,
      participantsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await eventRef.set(eventDoc);

    await incrementPlatformStats({ totalEvents: 1 });
    await incrementCollegeStats(actor.collegeId, { totalEvents: 1 });

    return ok(res, { event: eventDoc });
  } catch (error) {
    return next(error);
  }
};

const listEvents = async (req, res, next) => {
  try {
    const { category, collegeId, status, upcomingOnly, sortBy } = req.query || {};

    let query = db.collection('events');

    if (category && EVENT_CATEGORIES.includes(category)) {
      query = query.where('category', '==', category);
    }

    if (collegeId && isNonEmptyString(collegeId)) {
      query = query.where('collegeId', '==', collegeId.trim());
    }

    if (status && EVENT_STATUSES.includes(status)) {
      query = query.where('status', '==', status);
    }

    if (upcomingOnly === 'true') {
      query = query.where('startDate', '>=', new Date().toISOString());
    }

    const orderField = sortBy === 'createdAt' ? 'createdAt' : 'startDate';
    query = query.orderBy(orderField, 'asc');

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return ok(res, { events });
  } catch (error) {
    return next(error);
  }
};

const registerForEvent = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const eventId = req.params.eventId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!eventId) {
      throw new CustomError('Event id is required', 400, 'invalid_payload');
    }

    const eventRef = db.collection('events').doc(eventId);
    const registrationId = `${eventId}_${actor.uid}`;
    const registrationRef = db.collection('eventRegistrations').doc(registrationId);

    let eventTitle = null;

    await db.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      const registrationSnap = await transaction.get(registrationRef);

      if (!eventSnap.exists) {
        throw new CustomError('Event not found', 404, 'event_missing');
      }

      const event = eventSnap.data();
      eventTitle = event.title;

      if (event.collegeId !== actor.collegeId) {
        throw new CustomError('Cross-college registration forbidden', 403, 'college_mismatch');
      }

      if (event.status !== 'open') {
        throw new CustomError('Event registration closed', 403, 'event_closed');
      }

      if (event.registrationDeadline && Date.parse(event.registrationDeadline) < Date.now()) {
        throw new CustomError('Registration deadline passed', 403, 'deadline_passed');
      }

      if (registrationSnap.exists && registrationSnap.data().registrationStatus === 'registered') {
        throw new CustomError('Already registered', 409, 'already_registered');
      }

      const participantsCount = event.participantsCount || 0;
      if (event.maxParticipants && participantsCount >= event.maxParticipants) {
        throw new CustomError('Event is full', 403, 'event_full');
      }

      transaction.set(registrationRef, {
        registrationId,
        eventId,
        userId: actor.uid,
        collegeId: actor.collegeId,
        registrationStatus: 'registered',
        createdAt: new Date().toISOString(),
      }, { merge: true });

      transaction.set(eventRef, {
        participantsCount: participantsCount + 1,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    await createNotification({
      userId: actor.uid,
      type: 'event',
      title: 'Event registration confirmed',
      message: `You are registered for "${eventTitle || 'event'}".`,
      referenceId: eventId,
    });

    await logAudit({
      actionType: 'event_registration',
      performedBy: actor.uid,
      performedByRole: actor.role,
      targetId: eventId,
      targetType: 'event',
      collegeId: actor.collegeId,
    });

    return ok(res, { eventId, registered: true });
  } catch (error) {
    return next(error);
  }
};

const cancelEventRegistration = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const eventId = req.params.eventId;

    if (!actor || actor.role !== Roles.STUDENT) {
      throw new CustomError('Student only', 403, 'student_only');
    }

    if (!eventId) {
      throw new CustomError('Event id is required', 400, 'invalid_payload');
    }

    const eventRef = db.collection('events').doc(eventId);
    const registrationId = `${eventId}_${actor.uid}`;
    const registrationRef = db.collection('eventRegistrations').doc(registrationId);

    await db.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      const registrationSnap = await transaction.get(registrationRef);

      if (!eventSnap.exists) {
        throw new CustomError('Event not found', 404, 'event_missing');
      }

      if (!registrationSnap.exists) {
        throw new CustomError('Registration not found', 404, 'registration_missing');
      }

      const registration = registrationSnap.data();

      if (registration.registrationStatus !== 'registered') {
        throw new CustomError('Registration already cancelled', 409, 'registration_cancelled');
      }

      const event = eventSnap.data();
      const participantsCount = Math.max((event.participantsCount || 0) - 1, 0);

      transaction.set(registrationRef, {
        registrationStatus: 'cancelled',
      }, { merge: true });

      transaction.set(eventRef, {
        participantsCount,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    });

    return ok(res, { eventId, cancelled: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createEvent,
  listEvents,
  registerForEvent,
  cancelEventRegistration,
};
