const db = require('../services/firestore');
const CustomError = require('../utils/CustomError');
const { Roles } = require('../utils/roles');
const { incrementPlatformStats, incrementCollegeStats } = require('../services/stats.service');

const logger = require('../utils/logger');

const getEmailDomain = (email) => {
  if (!email || !email.includes('@')) return '';
  const domain = email.split('@')[1].trim().toLowerCase();
  return domain.startsWith('@') ? domain.slice(1) : domain;
};

const resolveCollegeByDomain = async (domain) => {
  // Built-in verified active domains
  const knownColleges = {
    'gla.ac.in': { id: 'c_gla', name: 'GLA University', domain: 'gla.ac.in', isActive: true },
    'iitd.ac.in': { id: 'c1', name: 'IIT Delhi', domain: 'iitd.ac.in', isActive: true },
    'iitb.ac.in': { id: 'c2', name: 'IIT Bombay', domain: 'iitb.ac.in', isActive: true },
    'nitt.ac.in': { id: 'c3', name: 'NIT Trichy', domain: 'nitt.ac.in', isActive: true },
    'bits.ac.in': { id: 'c4', name: 'BITS Pilani', domain: 'bits.ac.in', isActive: true },
    'dtu.ac.in': { id: 'c5', name: 'DTU', domain: 'dtu.ac.in', isActive: true },
  };

  if (knownColleges[domain]) {
    return knownColleges[domain];
  }

  try {
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
  } catch (err) {
    if (err instanceof CustomError) throw err;
    return null;
  }
};

const resolveRoleOverride = async (email) => {
  try {
    const snapshot = await db
      .collection('roleOverrides')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (_) {
    return null;
  }
};

const ensureProfile = async ({ role, email, collegeId, profile }) => {
  if (!role || !email) return;
  const collection = role === Roles.FACULTY
    ? 'faculty'
    : role === Roles.RECRUITER
      ? 'recruiters'
      : 'students';

  try {
    const existing = await db.collection(collection).where('email', '==', email).limit(1).get();
    if (!existing.empty) return;

    const doc = {
      ...(profile || {}),
      email,
      collegeId: collegeId || (profile && profile.collegeId) || null,
    };

    await db.collection(collection).add(doc);
  } catch (_) {}
};

const createUserDoc = async ({ uid, email }) => {
  const roleOverride = await resolveRoleOverride(email);
  const domain = getEmailDomain(email);
  const college = domain ? await resolveCollegeByDomain(domain) : null;

  if (!college && !roleOverride) {
    throw new CustomError('Your college email domain is not registered.', 403, 'COLLEGE_DOMAIN_NOT_ALLOWED');
  }

  const role = roleOverride?.role || Roles.STUDENT;
  const subRole = roleOverride?.subRole || null;
  const verificationStatus = roleOverride?.verificationStatus || 'pending';
  const collegeId = roleOverride?.collegeId || (college ? college.id : null);

  const userDoc = {
    uid,
    email,
    name: email.split('@')[0],
    role,
    subRole,
    collegeId,
    verificationStatus,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.collection('users').doc(uid).set(userDoc, { merge: true });

    await incrementPlatformStats({
      totalUsers: 1,
      totalStudents: role === Roles.STUDENT ? 1 : 0,
    }).catch(() => null);

    if (role === Roles.STUDENT && userDoc.collegeId) {
      await incrementCollegeStats(userDoc.collegeId, {
        totalStudents: 1,
      }).catch(() => null);
    }

    await ensureProfile({
      role,
      email,
      collegeId: userDoc.collegeId,
      profile: roleOverride?.profile || null,
    }).catch(() => null);
  } catch (dbErr) {
    logger.warn('[createUserDoc] Firestore write warning:', dbErr.message);
  }

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

    let userDoc = null;
    try {
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        userDoc = { id: userSnap.id, ...userSnap.data() };
      }
    } catch (readErr) {
      logger.warn('[attachUserProfile] Firestore read failed, will bootstrap userDoc:', readErr.message);
    }

    if (!userDoc) {
      userDoc = await createUserDoc({ uid, email });
    }

    // Validate active institution status for existing students & faculty
    if (userDoc.collegeId && userDoc.role !== Roles.RECRUITER && userDoc.platformRole !== 'superAdmin') {
      try {
        const collegeSnap = await db.collection('colleges').doc(userDoc.collegeId).get();
        if (collegeSnap.exists && collegeSnap.data()?.isActive === false) {
          throw new CustomError('Your institution is currently inactive or disabled.', 403, 'COLLEGE_INACTIVE');
        }
      } catch (colErr) {
        if (colErr instanceof CustomError) throw colErr;
      }
    }

    req.userProfile = userDoc;
    return next();
  } catch (error) {
    logger.error('[attachUserProfile] Error loading user profile:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    const statusCode = error.statusCode || (error.code === 'COLLEGE_DOMAIN_NOT_ALLOWED' ? 403 : 500);
    const err = (error instanceof CustomError || error.statusCode)
      ? error
      : new CustomError(error.message || 'Failed to load user profile', statusCode, error.code || 'profile_load_failed');
    return next(err);
  }
};

module.exports = {
  attachUserProfile,
};
