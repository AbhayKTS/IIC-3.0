# CollegeVerse Phase 14 - Real-Time Chat Engine

This document captures the Phase 14 community chat foundation.

## Collection

messages

## Schema

{
  "messageId": "msg_123",
  "communityId": "community_123",
  "senderId": "uid_001",
  "senderName": "Asha Verma",
  "content": "Hello community",
  "createdAt": "2026-02-16T10:00:00.000Z",
  "isFlagged": false
}

## Socket Events

- joinRoom { communityId }
- leaveRoom { communityId }
- sendMessage { communityId, content }

## Authentication

- Firebase ID token required in socket auth.
- User profile fetched from users collection.

## Moderation Hook

- Basic profanity list check.
- Blocks messages when matched.
- AI moderation can replace this later.

## Rate Limit

- 10 messages per 10 seconds per user.

## REST Endpoint

- GET /api/v1/communities/:id/messages

## Indexes

- messages: communityId ASC + createdAt DESC

## Security Rules Outline (Conceptual)

- Only community members can read messages.
- Clients cannot write messages directly.
- isFlagged server-controlled.
