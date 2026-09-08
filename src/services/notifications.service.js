const db = require('./firestore');
const CustomError = require('../utils/CustomError');

const NOTIFICATION_TYPES = ['verification', 'club', 'team', 'event', 'job', 'leaderboard'];

const createNotification = async ({ userId, type, title, message, referenceId }) => {
  if (!userId) {
    throw new CustomError('Notification userId is required', 400, 'notification_invalid');
  }

  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new CustomError('Notification type is invalid', 400, 'notification_invalid');
  }

  const notificationRef = db.collection('notifications').doc();
  const now = new Date().toISOString();

  const doc = {
    notificationId: notificationRef.id,
    userId,
    type,
    title: title || 'Notification',
    message: message || '',
    referenceId: referenceId || null,
    isRead: false,
    createdAt: now,
  };

  await notificationRef.set(doc);

  return doc;
};

module.exports = {
  createNotification,
  NOTIFICATION_TYPES,
};
