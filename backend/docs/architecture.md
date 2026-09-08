# Architecture Overview

## High-Level Components
- Express API with middleware for auth, role checks, and verification.
- Firebase Auth for identity and token verification.
- Firestore as primary data store.
- Socket.io for community chat.
- Observability via Winston logs, audit logs, and metrics logs.

## Data Flow
1) Client sends request with Firebase ID token.
2) API verifies token and loads user profile.
3) Request hits feature controller (events, clubs, teams, etc.).
4) Write operations log audit events and update stats.
5) Observability captures metrics and errors.

## Runtime Boundaries
- HTTP API: Express routes under `/api/v1`.
- Real-time: Socket.io namespace from [src/services/socket.js](../src/services/socket.js).
- System endpoints: `/health` and `/api/v1/status`.

## External Services
- Firestore (collections, analytics snapshots, audit logs).
- Firebase Auth (token verification).
- Optional Sentry for error tracking.
