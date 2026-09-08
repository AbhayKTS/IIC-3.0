# CollegeVerse Phase 8 - Team Formation Engine

This document captures the Phase 8 team formation system for team-based events.

## Collections

- teams
- teamMembers
- teamJoinRequests

## teams Schema

{
  "teamId": "team_123",
  "eventId": "event_456",
  "collegeId": "college_001",
  "teamName": "Alpha Coders",
  "createdBy": "uid_001",
  "maxMembers": 4,
  "currentMembersCount": 1,
  "status": "open",
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:00:00.000Z"
}

## teamMembers Schema

{
  "teamId": "team_123",
  "eventId": "event_456",
  "userId": "uid_001",
  "role": "leader",
  "joinedAt": "2026-02-15T12:00:00.000Z"
}

## teamJoinRequests Schema

{
  "requestId": "team_123_uid_002",
  "teamId": "team_123",
  "eventId": "event_456",
  "userId": "uid_002",
  "status": "pending",
  "createdAt": "2026-02-15T12:10:00.000Z"
}

## Endpoints

Student:
- POST /api/v1/student/events/:eventId/create-team
- POST /api/v1/student/teams/:teamId/request-join
- POST /api/v1/student/teams/:teamId/approve/:requestId

## Validation & Integrity

- Verified student required.
- One team per student per event enforced.
- Same-college restriction enforced.
- Team must be open and not full.
- Leader-only approval with transaction.
- currentMembersCount server-controlled.

## Indexes

- teams: eventId ASC
- teams: collegeId ASC + eventId ASC
- teamMembers: userId ASC + eventId ASC
- teamMembers: teamId ASC
- teamJoinRequests: teamId ASC + status ASC

## Security Rules Outline (Conceptual)

- Only leaders can approve requests.
- Students can create requests for themselves only.
- Clients cannot write directly to teamMembers.
- currentMembersCount immutable by client.
