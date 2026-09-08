const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { Roles } = require('../utils/roles');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');

const getEmailDomain = (email) => {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase();
};

const resolveCollegeByDomain = async (domain) => {
  const snapshot = await db
    .collection('colleges')
    .where('domain', '==', domain)
    .where('isActive', '==', true)
    .limit(2)
    .get();

  if (snapshot.empty) return null;
  if (snapshot.size > 1) {
    throw new CustomError('Multiple colleges share the same domain', 409, 'domain_conflict');
  }
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const resolveRoleOverride = async (email) => {
  const snapshot = await db
    .collection('roleOverrides')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const ensureProfile = async ({ role, email, collegeId, profile }) => {
  if (!role || !email) return;
  const collection = role === Roles.FACULTY
    ? 'faculty'
    : role === Roles.RECRUITER
      ? 'recruiters'
      : 'students';

  const existing = await db.collection(collection).where('email', '==', email).limit(1).get();
  if (!existing.empty) return;

  const doc = {
    ...(profile || {}),
    email,
    collegeId: collegeId || (profile && profile.collegeId) || null,
  };

  await db.collection(collection).add(doc);
};

const createUserDoc = async ({ uid, email }) => {
  const roleOverride = await resolveRoleOverride(email);
  const domain = getEmailDomain(email);
  const college = domain ? await resolveCollegeByDomain(domain) : null;

  if (!college && !roleOverride) {
    throw new CustomError('College domain not registered', 403, 'college_domain_invalid');
  }

  const role = roleOverride?.role || Roles.STUDENT;
  const subRole = roleOverride?.subRole || null;
  const verificationStatus = roleOverride?.verificationStatus || 'pending';
  const collegeId = roleOverride?.collegeId || (college ? college.id : null);

  const userDoc = {
    uid,
    email,
    role,
    subRole,
    collegeId,
    verificationStatus,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('users').doc(uid).set(userDoc);

  await incrementPlatformStats({
    totalUsers: 1,
    totalStudents: role === Roles.STUDENT ? 1 : 0,
  });

  if (role === Roles.STUDENT && userDoc.collegeId) {
    await incrementCollegeStats(userDoc.collegeId, {
      totalStudents: 1,
    });
  }

  await ensureProfile({
    role,
    email,
    collegeId: userDoc.collegeId,
    profile: roleOverride?.profile || null,
  });
  return userDoc;
};

const attachUserProfile = async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.uid) {
      throw new CustomError('Missing authentication context', 401, 'auth_missing');
    }

    const uid = req.auth.uid;
    const email = req.auth.email;

    if (!email) {
      throw new CustomError('Email not available for user', 400, 'email_missing');
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    const userDoc = userSnap.exists
      ? { id: userSnap.id, ...userSnap.data() }
      : await createUserDoc({ uid, email });

    req.userProfile = userDoc;
    return next();
  } catch (error) {
    const err = error instanceof CustomError
      ? error
      : new CustomError('Failed to load user profile', 500, 'profile_load_failed');
    return next(err);
  }
};

module.exports = {
  attachUserProfile,
};
