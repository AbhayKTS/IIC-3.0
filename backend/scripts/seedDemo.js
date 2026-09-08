/**
 * Seeds Firebase Auth users + Firestore collections for demo/dev usage.
 *
 * Run:  NODE_ENV=development node scripts/seedDemo.js
 *
 * What it creates:
 *   1. Firestore `colleges` docs  → so domain lookup works
 *   2. Firestore `roleOverrides`  → so faculty/recruiter get correct roles
 *   3. Firebase Auth users        → so frontend signInWithEmailAndPassword works
 *
 * Demo accounts after seeding:
 *   Student  (verified):  arjun@iitd.ac.in   / pass123
 *   Student  (pending):   priya@iitd.ac.in   / pass123
 *   Faculty:              rajesh@iitd.ac.in  / pass123
 *   Recruiter:            vikram@techcorp.com / pass123
 */

const admin = require('../src/services/firebaseAdmin');
const db = require('../src/services/firestore');

// ── Demo colleges ──────────────────────────────────────────────
const DEMO_COLLEGES = [
  { id: 'iitd',  name: 'IIT Delhi',       domain: 'iitd.ac.in',  isActive: true, location: 'New Delhi' },
  { id: 'iitb',  name: 'IIT Bombay',      domain: 'iitb.ac.in',  isActive: true, location: 'Mumbai' },
  { id: 'nitt',  name: 'NIT Trichy',      domain: 'nitt.ac.in',  isActive: true, location: 'Tiruchirappalli' },
  { id: 'bits',  name: 'BITS Pilani',     domain: 'bits.ac.in',  isActive: true, location: 'Pilani' },
  { id: 'dtu',   name: 'DTU',             domain: 'dtu.ac.in',   isActive: true, location: 'New Delhi' },
];

// ── Demo users ─────────────────────────────────────────────────
const DEMO_USERS = [
  {
    email: 'arjun@iitd.ac.in',
    password: 'pass123',
    displayName: 'Arjun Sharma',
    role: 'student',
    collegeId: 'iitd',
    verificationStatus: 'verified',
  },
  {
    email: 'priya@iitd.ac.in',
    password: 'pass123',
    displayName: 'Priya Patel',
    role: 'student',
    collegeId: 'iitd',
    verificationStatus: 'pending',
  },
  {
    email: 'rajesh@iitd.ac.in',
    password: 'pass123',
    displayName: 'Prof. Rajesh Kumar',
    role: 'faculty',
    subRole: 'adminFaculty',
    collegeId: 'iitd',
    verificationStatus: 'verified',
  },
  {
    email: 'vikram@techcorp.com',
    password: 'pass123',
    displayName: 'Vikram Mehta',
    role: 'recruiter',
    subRole: null,
    collegeId: null,
    verificationStatus: 'verified',
  },
];

// ── Helpers ────────────────────────────────────────────────────
const upsertAuthUser = async ({ email, password, displayName }) => {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    console.log(`  Auth user exists: ${email} (uid: ${existing.uid})`);
    return existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true,   // demo accounts are pre-verified
      });
      console.log(`  Auth user created: ${email} (uid: ${created.uid})`);
      return created.uid;
    }
    throw err;
  }
};

// ── Main ───────────────────────────────────────────────────────
const run = async () => {
  console.log('\n=== CollegeVerse Demo Seed ===\n');

  // 1. Seed colleges
  console.log('1) Seeding colleges...');
  for (const college of DEMO_COLLEGES) {
    const { id, ...data } = college;
    await db.collection('colleges').doc(id).set(data, { merge: true });
    console.log(`   ${college.name} (${college.domain})`);
  }

  // 2. Seed role overrides (for non-student roles)
  console.log('\n2) Seeding role overrides...');
  for (const user of DEMO_USERS) {
    if (user.role !== 'student') {
      const overrideId = user.email.replace(/[^a-z0-9]/gi, '_');
      await db.collection('roleOverrides').doc(overrideId).set({
        email: user.email,
        role: user.role,
        subRole: user.subRole || null,
        collegeId: user.collegeId || null,
        verificationStatus: user.verificationStatus || 'verified',
      }, { merge: true });
      console.log(`   ${user.email} → ${user.role}${user.subRole ? ` (${user.subRole})` : ''}`);
    }
  }

  // 3. Create Firebase Auth users
  console.log('\n3) Creating Firebase Auth users...');
  for (const user of DEMO_USERS) {
    const uid = await upsertAuthUser(user);

    // 4. Upsert Firestore user doc (what attachUserProfile reads/creates)
    const existingUser = await db.collection('users').doc(uid).get();
    if (!existingUser.exists) {
      await db.collection('users').doc(uid).set({
        uid,
        email: user.email,
        role: user.role,
        subRole: user.subRole || null,
        collegeId: user.collegeId || null,
        verificationStatus: user.verificationStatus,
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`   Firestore user doc created for ${user.email}`);
    } else {
      console.log(`   Firestore user doc exists for ${user.email}`);
    }
  }

  console.log('\n=== Seed complete ===');
  console.log('\nDemo credentials:');
  console.log('  Student (verified):  arjun@iitd.ac.in   / pass123');
  console.log('  Student (pending):   priya@iitd.ac.in   / pass123');
  console.log('  Faculty:             rajesh@iitd.ac.in  / pass123');
  console.log('  Recruiter:           vikram@techcorp.com / pass123');
  console.log('');

  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
