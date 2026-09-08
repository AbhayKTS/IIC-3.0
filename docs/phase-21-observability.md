# Phase 21: Observability & Monitoring

## Error Tracking Integration
- Optional Sentry integration with graceful fallback.
- Captures unhandled exceptions and 5xx errors with user and route context.

Example initialization:
```
SENTRY_DSN=your-dsn
```

Files:
- src/services/errorTracking.js
- src/middleware/errorHandler.js
- src/server.js

## Metrics Middleware
- Request metrics tracked via middleware and persisted to `metricsLogs`.
- Schema fields: route, method, statusCode, responseTimeMs, userRole, createdAt.

Files:
- src/middleware/requestMetrics.js
- src/services/metrics.service.js

## Alert Logic
- Rolling 5-minute window for error rate and response time.
- Thresholds:
  - Error rate > 5%
  - Average response time > 1s
  - Repeated login failures
  - Recruiter search abuse
 - Alerts go to console in dev and to webhook in prod.

## Health Endpoint Upgrade
- `/health` now returns:
  - status
  - uptime
  - memoryUsage
  - env
  - dbConnected
  - lastAnalyticsSnapshotTime

## Log Configuration
- JSON logs in production.
- Separate error log stream via Winston.
- Environment-controlled log level.

## Indexing Requirements
- metricsLogs: createdAt desc
- metricsLogs: route + createdAt

## Scalability Notes
- Metrics writes are async and non-blocking.
- In-memory rolling stats keep alerting lightweight.
- Socket event logging uses audit logs to avoid blocking the hot path.
