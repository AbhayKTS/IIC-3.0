# CollegeVerse Phase 7 - Events System

This document captures the Phase 7 events and registration engine.

## Collections

- events
- eventRegistrations

## events Schema

{
  "eventId": "event_123",
  "title": "AI Hackathon",
  "description": "48-hour build sprint",
  "category": "academic",
  "collegeId": "college_001",
  "createdBy": "uid_faculty",
  "startDate": "2026-03-01T10:00:00.000Z",
  "endDate": "2026-03-02T18:00:00.000Z",
  "registrationDeadline": "2026-02-28T23:59:59.000Z",
  "maxParticipants": 200,
  "isTeamEvent": false,
  "status": "open",
  "participantsCount": 0,
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:00:00.000Z"
}

## eventRegistrations Schema

{
  "registrationId": "event_123_uid_001",
  "eventId": "event_123",
  "userId": "uid_001",
  "collegeId": "college_001",
  "registrationStatus": "registered",
  "createdAt": "2026-02-16T10:00:00.000Z"
}

## Endpoints

Faculty:
- POST /api/v1/faculty/events

Student:
- POST /api/v1/student/events/:eventId/register
- POST /api/v1/student/events/:eventId/cancel

Public listing (authenticated):
- GET /api/v1/events

## Validation & Integrity

- Faculty can only create events for their college.
- Students must be verified to register.
- Students can register only once per event.
- Registration deadline enforced.
- maxParticipants enforced.
- participantsCount updated inside Firestore transactions.

## Indexes

- events: collegeId ASC + status ASC
- events: category ASC + startDate ASC
- events: collegeId ASC + category ASC
- eventRegistrations: eventId ASC + userId ASC
- eventRegistrations: userId ASC + eventId ASC

## Security Rules Outline (Conceptual)

- Only faculty can create events.
- Students cannot write to events.
- Students can write only their own registrations.
- participantsCount server-controlled.
