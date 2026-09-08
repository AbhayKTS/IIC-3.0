const admin = require('../services/firebaseAdmin');
const CustomError = require('../utils/CustomError');
const { recordAuthFailure } = require('../services/metrics.service');
const config = require('../config');

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      throw new CustomError('Missing authorization token', 401, 'auth_missing');
    }

    const decoded = await admin.auth().verifyIdToken(token);

    if (config.auth.requireEmailVerification && !decoded.email_verified) {
      throw new CustomError('Email verification required', 403, 'email_unverified');
    }

    req.auth = decoded;
    return next();
  } catch (error) {
    recordAuthFailure({ key: req.ip || 'unknown', reason: error.message });
    const err = error instanceof CustomError
      ? error
      : new CustomError('Invalid or expired token', 401, 'auth_invalid');
    return next(err);
  }
};

module.exports = {
  verifyFirebaseToken,
};
