const db = require('./firestore');

const addStudentToCollegeCommunity = async ({ userId, collegeId }) => {
  if (!userId || !collegeId) return null;

  const communitySnap = await db
    .collection('communities')
    .where('collegeId', '==', collegeId)
    .where('type', '==', 'college')
    .limit(1)
    .get();

  if (communitySnap.empty) return null;

  const communityDoc = communitySnap.docs[0];
  const community = { id: communityDoc.id, ...communityDoc.data() };
  const memberRef = db.collection('communityMembers').doc(`${community.id}_${userId}`);
  const communityRef = db.collection('communities').doc(community.id);

  await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const currentCommunitySnap = await transaction.get(communityRef);

    if (!currentCommunitySnap.exists) return;

    if (!memberSnap.exists) {
      transaction.set(memberRef, {
        communityId: community.id,
        userId,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });

      const currentCount = currentCommunitySnap.data().membersCount || 0;
      transaction.set(communityRef, {
        membersCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  });

  return community.id;
};

const isCommunityMember = async ({ userId, communityId }) => {
  if (!userId || !communityId) return false;

  const memberSnap = await db
    .collection('communityMembers')
    .doc(`${communityId}_${userId}`)
    .get();

  return memberSnap.exists;
};

const getCommunityById = async (communityId) => {
  if (!communityId) return null;
  const snap = await db.collection('communities').doc(communityId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
};

module.exports = {
  addStudentToCollegeCommunity,
  isCommunityMember,
  getCommunityById,
};
