const admin = require('../src/services/firebaseAdmin');
const db = require('../src/services/firestore');
const config = require('../src/config');

const fail = (message, details) => {
  console.error(`[firebase:preflight] ${message}`);
  if (details) console.error(details);
  process.exit(1);
};

const run = async () => {
  if (!config.firebase.projectId) {
    fail('FIREBASE_PROJECT_ID is missing');
  }

  if (!config.firebase.storageBucket) {
    fail('FIREBASE_STORAGE_BUCKET is missing');
  }

  try {
    await db.collection('_health').doc('ping').get();
    console.log('[firebase:preflight] Firestore OK');
  } catch (error) {
    fail('Firestore check failed', error.message);
  }

  try {
    const bucket = admin.storage().bucket(config.firebase.storageBucket);
    await bucket.getMetadata();
    console.log(`[firebase:preflight] Storage bucket OK: ${bucket.name}`);
  } catch (error) {
    fail('Storage bucket check failed', error.message);
  }

  try {
    await admin.auth().listUsers(1);
    console.log('[firebase:preflight] Firebase Auth Admin OK');
  } catch (error) {
    fail('Firebase Auth check failed', error.message);
  }

  console.log('[firebase:preflight] All Firebase checks passed');
};

run();
