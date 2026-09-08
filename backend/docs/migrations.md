# Migrations

## Strategy
- Schemas are versioned with `schemaVersion`.
- Missing schemaVersion defaults to 1.
- Soft deprecations are tracked in metadata.

## Migration Runner
- scripts/migrations/runMigration.js
- Batch updates with ordered pagination
- Logs to auditLogs

## Example
- scripts/migrations/2026-02-profile-visibility-score-rename.js

## Deployment Guard
- Apply indexes before migrations if queries change.
- Run in staging before production.
