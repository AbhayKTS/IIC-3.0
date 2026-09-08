# CollegeVerse Phase 13 - Community & Group Structure

This document captures the Phase 13 community system foundation.

## Collections

- communities
- communityMembers

## communities Schema

{
  "communityId": "community_123",
  "collegeId": "college_001",
  "name": "College Community",
  "description": "Official college-wide community",
  "type": "college",
  "createdBy": "uid_faculty",
  "visibility": "collegeOnly",
  "membersCount": 1200,
  "createdAt": "2026-02-16T10:00:00.000Z",
  "updatedAt": "2026-02-16T10:00:00.000Z"
}

## communityMembers Schema

{
  "communityId": "community_123",
  "userId": "uid_001",
  "role": "member",
  "joinedAt": "2026-02-16T10:05:00.000Z"
}

## Endpoints

Faculty:
- POST /api/v1/faculty/communities

Student:
- POST /api/v1/student/communities

User:
- POST /api/v1/user/communities/:communityId/join
- POST /api/v1/user/communities/:communityId/leave

## Mandatory College Community

- On student verification, add the student to the college community (type: college).
- If no college community exists, the join is skipped.

## Indexes

- communities: collegeId ASC + type ASC
- communities: collegeId ASC + visibility ASC
- communityMembers: userId ASC
- communityMembers: communityId ASC

## Security Rules Outline (Conceptual)

- Only faculty can create college or department communities.
- Students can create custom communities only.
- MembersCount is server-controlled.
- No duplicate membership.
