const config = require('../config');
const logger = require('../utils/logger');

let sentry = null;
let sentryEnabled = false;

const initSentry = () => {
  if (sentryEnabled) return;
  const dsn = config.observability?.sentryDsn;
  if (!dsn) return;

  try {
    // Lazy load to keep the dependency optional.
    // eslint-disable-next-line global-require
    sentry = require('@sentry/node');
    sentry.init({ dsn, environment: config.env });
    sentryEnabled = true;
  } catch (error) {
    logger.warn('Sentry dependency not available', { error: error.message });
  }
};

const withScope = (context, handler) => {
  if (!sentryEnabled || !sentry) return handler(null);
  return sentry.withScope((scope) => {
    if (context?.user) {
      scope.setUser(context.user);
    }
    if (context?.tags) {
      scope.setTags(context.tags);
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    handler(scope);
  });
};

const captureException = (error, context) => {
  initSentry();
  if (sentryEnabled && sentry) {
    return withScope(context, () => sentry.captureException(error));
  }
  logger.error('Captured exception (fallback)', { error, context });
  return null;
};

const captureMessage = (message, context) => {
  initSentry();
  if (sentryEnabled && sentry) {
    return withScope(context, () => sentry.captureMessage(message));
  }
  logger.warn('Captured message (fallback)', { message, context });
  return null;
};

module.exports = {
  captureException,
  captureMessage,
};
