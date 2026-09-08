const admin = require('./firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');

const databaseId = process.env.FIRESTORE_DATABASE_ID || 'almadox-for-the-students';
let db;
try {
  db = getFirestore(admin, databaseId);
} catch (_) {
  db = admin.firestore ? admin.firestore() : admin;
}

module.exports = db;
