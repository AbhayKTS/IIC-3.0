process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-test';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-test';
process.env.METRICS_LOGGING = 'false';

const admin = require('../../src/services/firebaseAdmin');
const db = require('../../src/services/firestore');

const collectionsToClear = [
  'users',
  'studentProfiles',
  'studentLeaderboard',
  'clubs',
  'jobPosts',
  'jobApplications',
  'events',
  'eventRegistrations',
  'teams',
  'clubMembers',
  'teamMembers',
  'teamJoinRequests',
  'notifications',
  'communities',
  'communityMembers',
  'analyticsSnapshots',
  'auditLogs',
  'metricsLogs',
  'companies',
  'colleges',
];

const deleteCollection = async (name) => {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

beforeAll(async () => {
  if (admin.firestore) {
    admin.firestore().settings({ ignoreUndefinedProperties: true });
  }
});

afterEach(async () => {
  await Promise.all(collectionsToClear.map((name) => deleteCollection(name)));
});
