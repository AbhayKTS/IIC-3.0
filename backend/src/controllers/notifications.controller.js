const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { isNonEmptyString } = require('../utils/validation');

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const listNotifications = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const { limit, cursor } = req.query || {};

    if (!actor || !actor.uid) {
      throw new CustomError('Missing user profile', 401, 'profile_missing');
    }

    const limitValue = Math.min(
      Math.max(Number(limit) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    let query = db
      .collection('notifications')
      .where('userId', '==', actor.uid)
      .orderBy('createdAt', 'desc')
      .limit(limitValue);

    if (cursor && isNonEmptyString(cursor)) {
      const cursorSnap = await db.collection('notifications').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snapshot = await query.get();
    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = snapshot.docs[snapshot.docs.length - 1]?.id || null;

    return ok(res, { notifications, nextCursor });
  } catch (error) {
    return next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const notificationId = req.params.id;

    if (!actor || !actor.uid) {
      throw new CustomError('Missing user profile', 401, 'profile_missing');
    }

    if (!notificationId) {
      throw new CustomError('Notification id is required', 400, 'invalid_payload');
    }

    const notificationRef = db.collection('notifications').doc(notificationId);
    const snapshot = await notificationRef.get();

    if (!snapshot.exists) {
      throw new CustomError('Notification not found', 404, 'notification_missing');
    }

    const notification = snapshot.data();

    if (notification.userId !== actor.uid) {
      throw new CustomError('Forbidden', 403, 'notification_forbidden');
    }

    await notificationRef.set({ isRead: true }, { merge: true });

    return ok(res, { notificationId, isRead: true });
  } catch (error) {
    return next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const actor = req.userProfile;

    if (!actor || !actor.uid) {
      throw new CustomError('Missing user profile', 401, 'profile_missing');
    }

    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', actor.uid)
      .where('isRead', '==', false)
      .get();

    if (snapshot.empty) {
      return ok(res, { updated: 0 });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.set(doc.ref, { isRead: true }, { merge: true });
    });

    await batch.commit();

    return ok(res, { updated: snapshot.size });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllRead,
};
