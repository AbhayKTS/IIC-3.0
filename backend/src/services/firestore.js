const admin = require('./firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');

const databaseId = process.env.FIRESTORE_DATABASE_ID || 'almadox-for-the-students';
let db;
try {
  const app = admin.apps && admin.apps.length > 0 ? admin.app() : undefined;
  db = app ? getFirestore(app, databaseId) : getFirestore(databaseId);
} catch (_) {
  try {
    db = getFirestore(databaseId);
  } catch (__) {
    db = admin.firestore ? admin.firestore() : admin;
  }
}

module.exports = db;
