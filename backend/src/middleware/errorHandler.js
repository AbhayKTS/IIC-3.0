const CustomError = require('../utils/CustomError');
const logger = require('../utils/logger');
const { captureException } = require('../services/errorTracking');

const errorHandler = (err, req, res, next) => {
  const error = err instanceof CustomError
    ? err
    : new CustomError('Internal Server Error');

  if (!error.isOperational) {
    logger.error('Non-operational error', { error });
  }

  logger.error(error.message, { code: error.code || 'internal_error', details: error.details });

  if (error.statusCode >= 500) {
    captureException(error, {
      user: req.userProfile ? { id: req.userProfile.uid, role: req.userProfile.role } : null,
      tags: {
        route: req.originalUrl || req.url,
        method: req.method,
        statusCode: String(error.statusCode),
      },
      extra: {
        code: error.code,
        details: error.details,
      },
    });
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      details: error.details,
    },
  });
};

module.exports = {
  errorHandler,
};
