# CollegeVerse Phase 9 - Club System

This document captures the Phase 9 club application and approval workflow.

## Collections

- clubs
- clubMembers

## clubs Schema

{
  "clubId": "club_123",
  "collegeId": "college_001",
  "name": "Robotics Club",
  "nameLower": "robotics club",
  "description": "Build and compete with robots",
  "category": "tech",
  "createdBy": "uid_001",
  "approvedBy": "uid_faculty",
  "status": "approved",
  "membersCount": 1,
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:10:00.000Z"
}

## clubMembers Schema

{
  "clubId": "club_123",
  "userId": "uid_001",
  "role": "founder",
  "joinedAt": "2026-02-15T12:00:00.000Z"
}

## Endpoints

Student:
- POST /api/v1/student/clubs/apply
- POST /api/v1/student/clubs/:clubId/join
- POST /api/v1/student/clubs/:clubId/leave

Faculty:
- POST /api/v1/faculty/clubs/:clubId/approve
- POST /api/v1/faculty/clubs/:clubId/reject

## Validation & Integrity

- Verified students only for applications and joins.
- Duplicate club names prevented per college.
- Faculty can approve only within their college.
- membersCount updated via transaction.
- Founder cannot leave without transfer (future).

## Indexes

- clubs: collegeId ASC + status ASC
- clubs: category ASC + collegeId ASC
- clubMembers: userId ASC
- clubMembers: clubId ASC

## Security Rules Outline (Conceptual)

- Students cannot approve or reject clubs.
- Only faculty can update club status.
- Students can create applications for themselves only.
- membersCount is server-controlled.
