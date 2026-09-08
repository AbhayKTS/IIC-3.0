# CollegeVerse Phase 12 - Notifications & Activity Feed

This document captures the Phase 12 in-app notification system.

## Collection

notifications

## Schema

{
  "notificationId": "notif_123",
  "userId": "uid_001",
  "type": "verification",
  "title": "Student verified",
  "message": "Your account has been verified by your college.",
  "referenceId": "uid_001",
  "isRead": false,
  "createdAt": "2026-02-16T10:00:00.000Z"
}

## Creation Triggers

- student verification
- club approval / rejection
- team join approval
- event registration confirmation
- job application shortlist
- leaderboard updates (future)

## Endpoints

- GET /api/v1/user/notifications
- POST /api/v1/user/notifications/:id/read
- POST /api/v1/user/notifications/read-all

## Pagination

- Cursor-based using notification document id
- Max limit 50

## Indexes

- notifications: userId ASC + createdAt DESC
- notifications: userId ASC + isRead ASC

## Security Rules Outline (Conceptual)

- Users read only their notifications.
- Clients cannot create notifications.
- Block cross-user updates.
