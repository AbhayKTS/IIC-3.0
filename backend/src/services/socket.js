const { Server } = require('socket.io');

const admin = require('./firebaseAdmin');
const db = require('./firestore');
const logger = require('../utils/logger');
const { moderationHook } = require('../utils/moderation');
const { isCommunityMember, getCommunityById } = require('./communities.service');
const { logAudit } = require('./audit.service');

const RATE_LIMIT_WINDOW_MS = 10 * 1000;
const RATE_LIMIT_MAX = 10;
const MESSAGE_MAX_LENGTH = 1000;
const DUPLICATE_WINDOW_MS = 30 * 1000;

const rateBuckets = new Map();
const lastMessages = new Map();

const checkRateLimit = (userId) => {
  const now = Date.now();
  const bucket = rateBuckets.get(userId) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, recent);
    return false;
  }

  recent.push(now);
  rateBuckets.set(userId, recent);
  return true;
};

const isDuplicateMessage = (userId, content) => {
  const now = Date.now();
  const entry = lastMessages.get(userId);
  if (entry && entry.content === content && now - entry.timestamp < DUPLICATE_WINDOW_MS) {
    return true;
  }
  lastMessages.set(userId, { content, timestamp: now });
  return false;
};

const resolveSenderName = async (userId, fallbackEmail) => {
  const profileSnap = await db.collection('studentProfiles').doc(userId).get();
  if (profileSnap.exists) {
    const profile = profileSnap.data();
    return profile.fullName || profile.name || fallbackEmail || 'Student';
  }
  return fallbackEmail || 'User';
};

const initSocket = (server, options = {}) => {
  const io = new Server(server, {
    cors: options.cors || { origin: '*', methods: ['GET', 'POST'] },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Missing auth token'));

      const decoded = await admin.auth().verifyIdToken(token);
      if (!decoded.email_verified) return next(new Error('Email not verified'));

      const userSnap = await db.collection('users').doc(decoded.uid).get();
      if (!userSnap.exists) return next(new Error('User profile missing'));

      socket.data.userProfile = { id: userSnap.id, ...userSnap.data() };
      socket.data.auth = decoded;
      return next();
    } catch (error) {
      logger.error('Socket auth failed', { error });
      setImmediate(() => {
        logAudit({
          actionType: 'socket_auth_failed',
          performedBy: 'system',
          performedByRole: 'system',
          targetType: 'socket',
          metadata: { error: error.message },
        }).catch(() => null);
      });
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.userProfile;

    socket.on('joinRoom', async ({ communityId }) => {
      try {
        if (!communityId) return socket.emit('errorMessage', { message: 'communityId required' });

        const isMember = await isCommunityMember({ userId: user.uid, communityId });
        if (!isMember) return socket.emit('errorMessage', { message: 'Not a community member' });

        socket.join(communityId);
        socket.emit('joinedRoom', { communityId });
      } catch (error) {
        socket.emit('errorMessage', { message: 'Join failed' });
      }
    });

    socket.on('leaveRoom', ({ communityId }) => {
      if (!communityId) return;
      socket.leave(communityId);
      socket.emit('leftRoom', { communityId });
    });

    socket.on('sendMessage', async ({ communityId, content }) => {
      try {
        if (!communityId || !content) {
          return socket.emit('errorMessage', { message: 'Invalid message payload' });
        }

        const trimmedContent = String(content).trim();
        if (!trimmedContent) {
          return socket.emit('errorMessage', { message: 'Empty message' });
        }

        if (trimmedContent.length > MESSAGE_MAX_LENGTH) {
          return socket.emit('errorMessage', { message: 'Message too long' });
        }

        const isMember = await isCommunityMember({ userId: user.uid, communityId });
        if (!isMember) {
          return socket.emit('errorMessage', { message: 'Not a community member' });
        }

        const community = await getCommunityById(communityId);
        if (!community) {
          return socket.emit('errorMessage', { message: 'Community not found' });
        }

        if (!checkRateLimit(user.uid)) {
          setImmediate(() => {
            logAudit({
              actionType: 'socket_rate_limited',
              performedBy: user.uid,
              performedByRole: user.role || 'student',
              targetType: 'socket',
              metadata: { communityId },
            }).catch(() => null);
          });
          return socket.emit('errorMessage', { message: 'Rate limit exceeded' });
        }

        if (isDuplicateMessage(user.uid, trimmedContent)) {
          setImmediate(() => {
            logAudit({
              actionType: 'socket_duplicate_message',
              performedBy: user.uid,
              performedByRole: user.role || 'student',
              targetType: 'socket',
              metadata: { communityId },
            }).catch(() => null);
          });
          return socket.emit('errorMessage', { message: 'Duplicate message blocked' });
        }

        const moderation = await moderationHook(trimmedContent);
        if (!moderation.allowed) {
          setImmediate(() => {
            logAudit({
              actionType: 'socket_message_blocked',
              performedBy: user.uid,
              performedByRole: user.role || 'student',
              targetType: 'socket',
              metadata: { communityId, reason: moderation.reason || 'blocked' },
            }).catch(() => null);
          });
          return socket.emit('messageBlocked', { reason: 'Content blocked' });
        }

        const senderName = await resolveSenderName(user.uid, user.email);
        const messageRef = db.collection('messages').doc();
        const message = {
          messageId: messageRef.id,
          communityId,
          senderId: user.uid,
          senderName,
          content: trimmedContent,
          createdAt: new Date().toISOString(),
          isFlagged: false,
        };

        await messageRef.set(message);
        io.to(communityId).emit('newMessage', message);
      } catch (error) {
        socket.emit('errorMessage', { message: 'Send failed' });
      }
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'client namespace disconnect') return;
      setImmediate(() => {
        logAudit({
          actionType: 'socket_disconnect',
          performedBy: user.uid,
          performedByRole: user.role || 'student',
          targetType: 'socket',
          metadata: { reason },
        }).catch(() => null);
      });
    });
  });

  return io;
};

module.exports = {
  initSocket,
};
