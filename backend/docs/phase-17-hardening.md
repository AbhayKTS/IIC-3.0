# CollegeVerse Phase 17 - System Hardening & Abuse Protection

This document captures the Phase 17 defensive controls.

## Global Rate Limiting

- 100 requests per 15 minutes per IP (global)
- Login attempts: 20 per 15 minutes (auth bootstrap)
- Recruiter search: 30 per minute

## Role Escalation Protection

- Role changes only via admin endpoint
- Admin cannot self-promote
- All role changes logged to audit logs

Endpoint:
- POST /api/v1/admin/change-role

## Search Abuse Guard

- Recruiter search requires at least one filter
- Max limit 50 per request
- Cursor pagination enforced

## Chat Abuse Controls

- 10 messages per 10 seconds
- Max message length 1000 chars
- Duplicate message throttling

## Security Headers

- Helmet with HSTS, frameguard, and referrer policy
- x-powered-by disabled
- CORS restricted by environment

## Protected Collections (Conceptual)

- leaderboard collections
- auditLogs
- analyticsSnapshots
- messages
- jobApplications

## Index Reminder

- No change required beyond earlier phases
- Ensure audit log indexes exist for filters and pagination
