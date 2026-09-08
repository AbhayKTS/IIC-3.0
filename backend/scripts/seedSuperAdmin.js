/**
 * Seeds a superAdmin user for CollegeVerse platform administration.
 *
 * Usage:
 *   NODE_ENV=development node scripts/seedSuperAdmin.js
 *
 * Optional env variables:
 *   SUPERADMIN_EMAIL=admin@collegeverse.internal
 *   SUPERADMIN_PASSWORD=CustomPassword123!
 *   SUPERADMIN_NAME="Platform Super Admin"
 */

const admin = require('../src/services/firebaseAdmin');
const db = require('../src/services/firestore');
const { Roles, FacultySubRoles } = require('../src/utils/roles');

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@collegeverse.internal';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Administrator';

const upsertAuthUser = async ({ email, password, displayName }) => {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`✓ Firebase Auth user exists: ${email} (uid: ${existing.uid})`);
    return existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log(`✓ Created Firebase Auth user: ${email} (uid: ${created.uid})`);
      return created.uid;
    }
    throw err;
  }
};

const run = async () => {
  console.log('\n=== Seeding CollegeVerse SuperAdmin ===\n');

  // 1. Upsert Auth User
  const uid = await upsertAuthUser({
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
    displayName: SUPERADMIN_NAME,
  });

  const now = new Date().toISOString();

  // 2. Set Firestore user document with platformRole: 'superAdmin'
  const userDoc = {
    uid,
    email: SUPERADMIN_EMAIL,
    displayName: SUPERADMIN_NAME,
    role: Roles.FACULTY,
    subRole: FacultySubRoles.ADMIN,
    platformRole: 'superAdmin',
    collegeId: null,
    verificationStatus: 'verified',
    schemaVersion: 1,
    updatedAt: now,
  };

  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    userDoc.createdAt = now;
  }
  await userRef.set(userDoc, { merge: true });
  console.log(`✓ Firestore users doc updated with platformRole: 'superAdmin'`);

  // 3. Upsert roleOverrides so attachUserProfile preserves it on future logins
  const overrideId = SUPERADMIN_EMAIL.replace(/[^a-z0-9]/gi, '_');
  await db.collection('roleOverrides').doc(overrideId).set({
    email: SUPERADMIN_EMAIL,
    role: Roles.FACULTY,
    subRole: FacultySubRoles.ADMIN,
    platformRole: 'superAdmin',
    collegeId: null,
    verificationStatus: 'verified',
    updatedAt: now,
  }, { merge: true });
  console.log(`✓ Firestore roleOverrides doc updated`);

  // 4. Upsert faculty profile
  await db.collection('facultyProfiles').doc(uid).set({
    userId: uid,
    designation: 'Platform Super Administrator',
    department: 'Platform Administration',
    permissionsLevel: FacultySubRoles.ADMIN,
    updatedAt: now,
  }, { merge: true });
  console.log(`✓ Firestore facultyProfiles doc updated`);

  console.log('\n=== SuperAdmin Seed Complete ===');
  console.log(`Email:    ${SUPERADMIN_EMAIL}`);
  console.log(`Password: ${SUPERADMIN_PASSWORD}`);
  console.log(`Role:     ${Roles.FACULTY} (${FacultySubRoles.ADMIN})`);
  console.log(`Platform: superAdmin (platformRole: 'superAdmin')\n`);

  process.exit(0);
};

run().catch((err) => {
  console.error('SuperAdmin seed failed:', err.message || err);
  process.exit(1);
});
