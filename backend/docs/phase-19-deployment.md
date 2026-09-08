# Phase 19: Deployment Architecture & Environment Strategy

## Environment Folder Structure
```
.env.development
.env.staging
.env.production
.env.example
.github/workflows/ci-cd.yml
firestore.rules.dev
firestore.rules.staging
firestore.rules.prod
src/config/index.js
```

## Config Loader Example
- Environment-aware loading based on `NODE_ENV` in [src/config/index.js](../src/config/index.js).
- Supports per-environment defaults for CORS, rate limits, and logging.
- Uses separate Firebase service accounts via env vars or `FIREBASE_SERVICE_ACCOUNT_PATH`.

## .env.example
- Template is in [.env.example](../.env.example).
- Copy to `.env.development`, `.env.staging`, `.env.production`.

## CI/CD YAML Example
- GitHub Actions sample in [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml).
- Runs lint/tests/build before deploy.
- Deploys staging from `dev` and production from `main`.

## Deployment Checklist
- Create Firebase projects for dev/staging/prod.
- Generate service accounts for each project.
- Store secrets in GitHub Actions secrets or secret manager.
- Populate `.env.*` with environment-specific values.
- Deploy Firestore rules using the correct rules file per environment.
- Verify `/health` returns `status=ok`, `environment`, and `db.ok=true`.
- Confirm Socket.io deployment mode (sticky sessions or single instance).

## Rollback Strategy
- Tag releases (e.g., `v1.3.0`) before deployment.
- Roll back code by redeploying the previous tag or commit SHA.
- Revert Firestore rules using the previous environment rules file.
- Validate `/health` and critical flows after rollback.

## Scalability Notes
- Use environment-level rate limits and CORS allowlists.
- Prefer JSON logging to stdout for Firebase/Cloud Logging ingestion.
- For Socket.io, use a single instance or add a shared adapter before scaling horizontally.
