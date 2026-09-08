const db = require('./firestore');
const logger = require('../utils/logger');
const config = require('../config');

const WINDOW_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 2 * 60 * 1000;
const MAX_WINDOW_ITEMS = 5000;

const state = {
  requests: [],
  authFailures: new Map(),
  searchAbuse: new Map(),
  lastAlertAt: new Map(),
};

const nowIso = () => new Date().toISOString();

const pruneWindow = (now) => {
  const cutoff = now - WINDOW_MS;
  while (state.requests.length && state.requests[0].ts < cutoff) {
    state.requests.shift();
  }
  if (state.requests.length > MAX_WINDOW_ITEMS) {
    state.requests.splice(0, state.requests.length - MAX_WINDOW_ITEMS);
  }
};

const shouldAlert = (key) => {
  const last = state.lastAlertAt.get(key) || 0;
  const now = Date.now();
  if (now - last < ALERT_COOLDOWN_MS) return false;
  state.lastAlertAt.set(key, now);
  return true;
};

const sendAlert = async ({ type, message, meta }) => {
  if (!shouldAlert(type)) return;

  const payload = { type, message, meta, createdAt: nowIso() };

  if (config.env === 'production' && config.observability?.alertWebhookUrl) {
    try {
      await fetch(config.observability.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return;
    } catch (error) {
      logger.warn('Alert webhook failed', { error: error.message });
    }
  }

  logger.warn('Alert triggered', payload);
};

const recordRequest = ({ statusCode, responseTimeMs, route, method, userRole }) => {
  const ts = Date.now();
  state.requests.push({ ts, statusCode, responseTimeMs, route, method, userRole });
  pruneWindow(ts);

  const total = state.requests.length;
  const errors = state.requests.filter((entry) => entry.statusCode >= 500).length;
  const avgResponse = total
    ? state.requests.reduce((sum, entry) => sum + entry.responseTimeMs, 0) / total
    : 0;

  if (total && errors / total > 0.05) {
    sendAlert({
      type: 'high_error_rate',
      message: 'Error rate exceeded 5% in 5 min window',
      meta: { errorRate: errors / total, total, errors },
    });
  }

  if (total && avgResponse > 1000) {
    sendAlert({
      type: 'high_response_time',
      message: 'Average response time exceeded 1s in 5 min window',
      meta: { averageResponseMs: avgResponse, total },
    });
  }

  if (responseTimeMs > 500) {
    logger.warn('Slow request detected', { route, method, responseTimeMs, statusCode });
  }
};

const recordAuthFailure = ({ key, reason }) => {
  const ts = Date.now();
  const list = state.authFailures.get(key) || [];
  const cutoff = ts - WINDOW_MS;
  const filtered = list.filter((item) => item > cutoff);
  filtered.push(ts);
  state.authFailures.set(key, filtered);

  if (filtered.length >= 5) {
    sendAlert({
      type: 'auth_failures',
      message: 'Repeated failed login attempts detected',
      meta: { key, count: filtered.length, reason },
    });
  }
};

const recordSearchAbuse = ({ key, reason }) => {
  const ts = Date.now();
  const list = state.searchAbuse.get(key) || [];
  const cutoff = ts - WINDOW_MS;
  const filtered = list.filter((item) => item > cutoff);
  filtered.push(ts);
  state.searchAbuse.set(key, filtered);

  if (filtered.length >= 10) {
    sendAlert({
      type: 'search_abuse',
      message: 'Repeated recruiter search abuse detected',
      meta: { key, count: filtered.length, reason },
    });
  }
};

const recordSlowQuery = ({ label, durationMs, meta }) => {
  if (durationMs <= 500) return;
  logger.warn('Slow query detected', { label, durationMs, meta });
};

const logRequestMetric = async ({ route, method, statusCode, responseTimeMs, userRole }) => {
  if (config.observability?.metricsLogging === false) return;

  const docRef = db.collection('metricsLogs').doc();
  await docRef.set({
    route,
    method,
    statusCode,
    responseTimeMs,
    userRole: userRole || 'anonymous',
    createdAt: nowIso(),
  });
};

module.exports = {
  recordRequest,
  recordAuthFailure,
  recordSearchAbuse,
  recordSlowQuery,
  logRequestMetric,
};
