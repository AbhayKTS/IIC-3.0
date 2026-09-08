const { recordRequest, logRequestMetric } = require('../services/metrics.service');

const sanitizeRoute = (url) => {
  if (!url) return '/';
  return url.split('?')[0];
};

const requestMetrics = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const responseTimeMs = Number(elapsedNs) / 1e6;
    const route = sanitizeRoute(req.originalUrl || req.url);
    const userRole = req.userProfile?.role || req.auth?.role || null;

    const payload = {
      route,
      method: req.method,
      statusCode: res.statusCode,
      responseTimeMs: Math.round(responseTimeMs),
      userRole,
    };

    recordRequest(payload);

    setImmediate(() => {
      logRequestMetric(payload).catch(() => null);
    });
  });

  return next();
};

module.exports = {
  requestMetrics,
};
