# Phase 20: Data Migration & Schema Versioning Strategy

## Schema Version Field
Collections with `schemaVersion: 1` on new writes:
- users
- studentProfiles
- studentLeaderboard
- clubs
- jobPosts
- communities

## Migration Runner Utility
Location:
- scripts/migrations/runMigration.js

Capabilities:
- Batch processing with ordered pagination
- Safe merges with `schemaVersion` bump
- Audit logging to `auditLogs`

## Sample Migration
File:
- scripts/migrations/2026-02-profile-visibility-score-rename.js

What it does:
- Adds `profileVisibility: public` if missing
- Copies `totalScore` to `overallScore`
- Marks `metadata.deprecated.totalScore = true`
- Bumps `schemaVersion` from 1 to 2

## Backward Compatibility Guards
- Missing `schemaVersion` defaults to 1.
- `overallScore` falls back to `totalScore`.
- `profileVisibility` defaults to `public`.

## Audit Logging
Every migration writes a single `auditLogs` entry with:
- migrationName
- affected collection
- documentsUpdated
- executedBy
- timestamp

## Deployment Guard
- Deploy composite indexes before data migrations when query patterns change.
- Run migrations in staging first.
- Verify migration summary and spot-check documents.
- Deploy code after data is upgraded.

## Soft Deprecation Strategy
- Mark deprecated fields in metadata.
- Keep old fields until the full migration cycle completes.
- Remove deprecated fields only in a later schema version.

## Migration Checklist
- Confirm new indexes exist for any new query fields.
- Back up critical collections (export or snapshots).
- Run migration with dry run (if enabled) and monitor output.
- Execute migration in batches.
- Validate document counts updated.
- Confirm `/health` and core flows after migration.
- Tag the deployment and document rollback steps.

## Rollback Awareness
- Keep previous schema version compatible code until migration is validated.
- Re-run migration only for failed batches.
- Roll back by redeploying previous tag and restoring older rules if needed.
