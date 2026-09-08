# API Overview

## Base
- Prefix: /api/v1
- Health: GET /health
- Status: GET /api/v1/status

## Auth
- POST /api/v1/auth/bootstrap

## Student
- GET /api/v1/student/me
- GET /api/v1/student/profile
- POST /api/v1/student/profile
- PUT /api/v1/student/profile
- POST /api/v1/student/events/:eventId/register
- POST /api/v1/student/events/:eventId/cancel
- POST /api/v1/student/events/:eventId/create-team
- POST /api/v1/student/teams/:teamId/request-join
- POST /api/v1/student/teams/:teamId/approve/:requestId
- POST /api/v1/student/clubs/apply
- POST /api/v1/student/clubs/:clubId/join
- POST /api/v1/student/clubs/:clubId/leave
- POST /api/v1/student/jobs/:jobId/apply
- GET /api/v1/student/applications
- POST /api/v1/student/communities

## Faculty
- GET /api/v1/faculty/pending-students
- POST /api/v1/faculty/verify-student
- GET /api/v1/faculty/student/:id
- POST /api/v1/faculty/events
- POST /api/v1/faculty/clubs/:clubId/approve
- POST /api/v1/faculty/clubs/:clubId/reject
- POST /api/v1/faculty/communities
- GET /api/v1/faculty/analytics
- GET /api/v1/faculty/audit-logs

## Admin (AdminFaculty)
- POST /api/v1/admin/faculty
- POST /api/v1/admin/recalculate-rankings
- GET /api/v1/admin/analytics
- POST /api/v1/admin/generate-analytics
- GET /api/v1/admin/audit-logs
- POST /api/v1/admin/change-role

## Recruiter
- GET /api/v1/recruiter/student/:id
- GET /api/v1/recruiter/search
- POST /api/v1/recruiter/jobs
- POST /api/v1/recruiter/jobs/:jobId/shortlist/:applicationId
- GET /api/v1/recruiter/jobs/:jobId/applications

## Shared
- GET /api/v1/events
- GET /api/v1/communities/:id/messages
- GET /api/v1/user/notifications
- POST /api/v1/user/notifications/:id/read
- POST /api/v1/user/notifications/read-all
- POST /api/v1/user/communities/:communityId/join
- POST /api/v1/user/communities/:communityId/leave
