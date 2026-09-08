# CollegeVerse Phase 15 - Analytics & Admin Dashboard

This document captures the Phase 15 analytics snapshot system.

## Collection

analyticsSnapshots

## Schema

{
  "snapshotId": "snap_123",
  "snapshotType": "platform",
  "collegeId": null,
  "totalUsers": 12000,
  "totalStudents": 9000,
  "totalVerifiedStudents": 7600,
  "totalFaculty": 500,
  "totalRecruiters": 120,
  "totalEvents": 240,
  "totalClubs": 150,
  "totalTeams": 60,
  "totalJobPosts": 80,
  "totalApplications": 900,
  "averageScore": 123.45,
  "createdAt": "2026-02-16T12:00:00.000Z"
}

## Endpoints

Admin:
- GET /api/v1/admin/analytics
- POST /api/v1/admin/generate-analytics

Faculty:
- GET /api/v1/faculty/analytics

## Snapshot Logic

- Aggregates counts using Firestore count() queries.
- Computes averageScore from studentLeaderboard.
- Stores analytics snapshot for later read.

## Indexes

- analyticsSnapshots: snapshotType ASC + createdAt DESC
- analyticsSnapshots: collegeId ASC + createdAt DESC

## Security Rules Outline (Conceptual)

- Only admin faculty can generate platform snapshots.
- Faculty can read only their college snapshots.
- No client write access.
