const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { ok } = require('../utils/response');
const { isNonEmptyString } = require('../utils/validation');
const { isCommunityMember } = require('../services/communities.service');

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const listCommunityMessages = async (req, res, next) => {
  try {
    const actor = req.userProfile;
    const communityId = req.params.id;
    const { limit, cursor } = req.query || {};

    if (!actor || !actor.uid) {
      throw new CustomError('Missing user profile', 401, 'profile_missing');
    }

    if (!communityId) {
      throw new CustomError('Community id is required', 400, 'invalid_payload');
    }

    const isMember = await isCommunityMember({ userId: actor.uid, communityId });
    if (!isMember) {
      throw new CustomError('Community access forbidden', 403, 'community_forbidden');
    }

    const limitValue = Math.min(
      Math.max(Number(limit) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    let query = db
      .collection('messages')
      .where('communityId', '==', communityId)
      .orderBy('createdAt', 'desc')
      .limit(limitValue);

    if (cursor && isNonEmptyString(cursor)) {
      const cursorSnap = await db.collection('messages').doc(cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor = snapshot.docs[snapshot.docs.length - 1]?.id || null;

    return ok(res, { messages, nextCursor });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listCommunityMessages,
};
