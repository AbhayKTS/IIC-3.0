# CollegeVerse Phase 6 - Leaderboard Engine & Score Aggregation

This document captures the Phase 6 leaderboard architecture and scoring model.

## Collections

- leaderboardCategories
- studentLeaderboard
- collegeLeaderboard

## leaderboardCategories

Document: leaderboardCategories/{categoryId}

{
  "categoryId": "academic",
  "weightMultiplier": 1,
  "createdAt": "2026-02-15T10:00:00.000Z"
}

## studentProfiles Extension

Added fields:
- categoryScores: { academic, sports, cultural }
- totalScore

Defaults:
- all scores default to 0
- server-controlled only

## studentLeaderboard (Denormalized)

Document: studentLeaderboard/{userId}

{
  "userId": "uid_123",
  "collegeId": "college_001",
  "categoryScores": {
    "academic": 120,
    "sports": 40,
    "cultural": 20
  },
  "totalScore": 180,
  "rankNational": 15,
  "rankCollege": 2,
  "updatedAt": "2026-02-15T12:00:00.000Z"
}

## collegeLeaderboard

Document: collegeLeaderboard/{collegeId}

{
  "collegeId": "college_001",
  "totalCollegeScore": 12500,
  "totalStudents": 340,
  "averageScore": 36.76,
  "rankNational": 4,
  "updatedAt": "2026-02-15T12:30:00.000Z"
}

## Score Update Service

Server-only function:
- updateStudentScore(userId, category, points)

Logic:
- Increment categoryScores[category]
- Recalculate totalScore
- Update studentLeaderboard
- Recalculate college leaderboard for that college

## Ranking Recalculation

Manual admin endpoint:
- POST /api/v1/admin/recalculate-rankings

Logic:
- Sort studentLeaderboard by totalScore desc
- Assign rankNational
- Group by collegeId and assign rankCollege
- Sort collegeLeaderboard by totalCollegeScore and assign rankNational

## Access Rules

- Students, faculty, recruiters: read-only
- Only backend can write leaderboard collections

## Firestore Indexes

- studentLeaderboard: totalScore DESC
- studentLeaderboard: collegeId ASC + totalScore DESC
- collegeLeaderboard: totalCollegeScore DESC

## Security Rules Outline (Conceptual)

- Block client writes to leaderboard collections.
- Only service account can update scores.
- Leaderboard reads allowed for verified users only.
