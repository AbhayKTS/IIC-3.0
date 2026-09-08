# CollegeVerse Backend

## Overview
CollegeVerse is a Node.js + Express backend for student verification, profiles, leaderboards, events, teams, clubs, placements, recruiter search, notifications, communities/chat, analytics, audit logs, and observability.

## Architecture (Text Diagram)
```
[Client Apps]
      |
      v
[Express API] ---> [Middleware: Auth/RBAC/Verified]
      |
      +--> [Firestore]
      |
      +--> [Firebase Auth]
      |
      +--> [Socket.io Chat]
      |
      +--> [Observability: metricsLogs, auditLogs]
```

## Tech Stack
- Node.js, Express
- Firebase Admin SDK (Firestore + Auth)
- Socket.io
- Winston logging
- Jest + Supertest + Firebase Emulator (tests)

## Environment Setup
1) Install Node.js (>= 20)
2) Copy env template and set values:
   - [.env.example](.env.example)
3) Configure Firebase Admin credentials:
   - Use per-environment service accounts

## Emulator Setup (Testing)
- Firestore/Auth emulators are defined in [firebase.json](firebase.json).
- Start emulators:
  - `scripts/emulator-setup.sh`
- Run integration tests:
  - `npm run test:integration`

## Run Locally
- Install deps: `npm ci`
- Start API: `npm run start`

## Firebase Blaze Readiness Check
- Ensure these are set in your active env file:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (or inline admin credentials)
  - `FIREBASE_STORAGE_BUCKET`
- Run preflight:
  - `npm run firebase:preflight`

## Deployment Overview
- CI/CD pipeline: [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)
- Environments: development, staging, production
- Health check: `GET /health`

## Documentation
- Architecture: [docs/architecture.md](docs/architecture.md)
- Collections: [docs/collections.md](docs/collections.md)
- Role access matrix: [docs/role-access-matrix.md](docs/role-access-matrix.md)
- API overview: [docs/api-overview.md](docs/api-overview.md)
- Deployment: [docs/deployment.md](docs/deployment.md)
- Migrations: [docs/migrations.md](docs/migrations.md)
- Testing: [docs/testing.md](docs/testing.md)
- Security: [docs/security.md](docs/security.md)
- Performance: [docs/performance.md](docs/performance.md)
