# CollegeVerse Phase 2 - Core Database Schema (Firestore)

This document defines the Firestore core schema for CollegeVerse Phase 2.
It focuses on scalable, NoSQL-native structure with light denormalization.

## Top-Level Collections

- colleges
- users
- studentProfiles
- facultyProfiles
- recruiterProfiles
- leaderboards
- events
- clubs
- placements
- communities
- auditLogs

## Core User Document

Collection: users/{uid}

Required fields:
- uid
- email
- role (student | faculty | recruiter)
- subRole (adminFaculty | faculty | null)
- collegeId (null for recruiters)
- verificationStatus (pending | verified | rejected)
- createdAt
- updatedAt

Example:

{
  "uid": "uid_123",
  "email": "student@college.edu",
  "role": "student",
  "subRole": null,
  "collegeId": "college_001",
  "verificationStatus": "pending",
  "createdAt": "2026-02-15T10:00:00.000Z",
  "updatedAt": "2026-02-15T10:00:00.000Z"
}

## College Document

Collection: colleges/{collegeId}

Fields:
- collegeId
- name
- domain
- location
- verified
- createdAt

Example:

{
  "collegeId": "college_001",
  "name": "ABC Institute of Technology",
  "domain": "college.edu",
  "location": "Bengaluru, IN",
  "verified": true,
  "createdAt": "2026-02-15T09:00:00.000Z"
}

## Student Profile

Collection: studentProfiles/{userId}

Fields:
- userId
- enrollmentYear
- branch
- achievementsCount
- leaderboardScore
- resumeSections
- codingProfiles
- clubMemberships

Example:

{
  "userId": "uid_123",
  "enrollmentYear": 2023,
  "branch": "CSE",
  "achievementsCount": 12,
  "leaderboardScore": 842,
  "resumeSections": {
    "summary": "Final-year CSE student focused on backend systems.",
    "education": [{ "degree": "B.Tech CSE", "year": 2027 }],
    "projects": [{ "title": "EventHub", "tech": ["Node.js", "Postgres"] }]
  },
  "codingProfiles": {
    "github": "https://github.com/user",
    "leetcode": "https://leetcode.com/user",
    "codeforces": null,
    "codechef": null
  },
  "clubMemberships": ["club_001", "club_002"]
}

## Faculty Profile

Collection: facultyProfiles/{userId}

Fields:
- userId
- designation
- department
- permissionsLevel

Example:

{
  "userId": "uid_901",
  "designation": "Professor",
  "department": "Computer Science",
  "permissionsLevel": "admin"
}

## Recruiter Profile

Collection: recruiterProfiles/{userId}

Fields:
- userId
- companyName
- designation
- verifiedCompany

Example:

{
  "userId": "uid_700",
  "companyName": "TalentHive",
  "designation": "Technical Recruiter",
  "verifiedCompany": true
}

## Leaderboards

Collection: leaderboards/{leaderboardId}

Fields:
- leaderboardId
- collegeId
- scope (college | national)
- category (education | sports | cultural)
- season
- entries (denormalized)
- updatedAt

Example:

{
  "leaderboardId": "lb_college_001_academic_2026",
  "collegeId": "college_001",
  "scope": "college",
  "category": "education",
  "season": "2026",
  "entries": [
    { "userId": "uid_123", "score": 842, "rank": 1 },
    { "userId": "uid_124", "score": 800, "rank": 2 }
  ],
  "updatedAt": "2026-02-15T10:10:00.000Z"
}

## Events

Collection: events/{eventId}

Fields:
- eventId
- collegeId
- title
- type
- startAt
- endAt
- status
- createdBy

Example:

{
  "eventId": "event_1001",
  "collegeId": "college_001",
  "title": "AI Hackathon",
  "type": "tech",
  "startAt": "2026-03-01T10:00:00.000Z",
  "endAt": "2026-03-02T18:00:00.000Z",
  "status": "upcoming",
  "createdBy": "uid_901"
}

## Clubs

Collection: clubs/{clubId}

Fields:
- clubId
- collegeId
- name
- status
- createdBy
- facultyApproverId

Example:

{
  "clubId": "club_001",
  "collegeId": "college_001",
  "name": "Robotics Club",
  "status": "approved",
  "createdBy": "uid_123",
  "facultyApproverId": "uid_901"
}

## Placements

Collection: placements/{placementId}

Fields:
- placementId
- collegeId
- companyName
- role
- status
- applyBy
- createdAt

Example:

{
  "placementId": "pl_001",
  "collegeId": "college_001",
  "companyName": "TalentHive",
  "role": "Backend Intern",
  "status": "open",
  "applyBy": "2026-04-01T23:59:59.000Z",
  "createdAt": "2026-02-15T12:00:00.000Z"
}

## Communities

Collection: communities/{communityId}

Fields:
- communityId
- collegeId
- department
- createdBy

Example:

{
  "communityId": "comm_cse_2026",
  "collegeId": "college_001",
  "department": "CSE",
  "createdBy": "uid_901"
}

## Audit Logs

Collection: auditLogs/{logId}

Fields:
- logId
- actorId
- action
- targetId
- collegeId
- createdAt

Example:

{
  "logId": "log_9001",
  "actorId": "uid_901",
  "action": "verify_student",
  "targetId": "uid_123",
  "collegeId": "college_001",
  "createdAt": "2026-02-15T12:30:00.000Z"
}

## Relationship Strategy

- Users are the source of truth for role and verification status.
- Role-specific data lives in separate collections to keep reads lean.
- References use IDs, avoiding deep nesting for scalability.
- Denormalized leaderboards reduce read fan-out and improve ranking performance.

## Index Strategy (Composite)

Suggested composite indexes:
- users: role ASC, collegeId ASC
- users: verificationStatus ASC, collegeId ASC
- studentProfiles: collegeId ASC, leaderboardScore DESC
- events: collegeId ASC, startAt DESC
- placements: collegeId ASC, status ASC, applyBy ASC

## Security Rule Outline (Conceptual)

- Students can edit only their own profile.
- Faculty can verify students only in their college.
- Recruiters are read-only for student data and only for verified students.
- Only admin faculty can create faculty accounts.

## Scalability Notes

- Flat collections keep document size and query cost controlled.
- Denormalized ranking data supports fast leaderboard loads.
- Composite indexes protect query performance at scale.
- Separate role profiles reduce over-fetching and allow independent evolution.
