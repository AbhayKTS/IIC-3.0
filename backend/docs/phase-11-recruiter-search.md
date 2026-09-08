# CollegeVerse Phase 11 - Recruiter Search & Talent Discovery

This document captures the Phase 11 recruiter search engine using studentLeaderboard.

## Endpoint

GET /api/v1/recruiter/search

Query params:
- skills (csv or array)
- collegeId
- minScore
- category (academic | sports | cultural)
- sortBy (totalScore | categoryScore)
- order (asc | desc)
- limit (max 50)
- cursor (last leaderboard document id)

## Query Strategy

- Base collection: studentLeaderboard
- Optional filters: collegeId, minScore
- Ordering: totalScore or categoryScores.{category}
- Cursor pagination using startAfter
- Batch fetch studentProfiles and users by userId

## Skill Filtering

- Normalize skill strings to lowercase
- In-memory filter using the limited result set
- Avoid scanning entire collections

## Response Shape

{
  "results": [
    {
      "userId": "uid_001",
      "fullName": "Asha Verma",
      "collegeId": "college_001",
      "totalScore": 230,
      "categoryScores": { "academic": 120, "sports": 80, "cultural": 30 },
      "skills": ["Node.js", "PostgreSQL"],
      "codingProfiles": { "github": "https://github.com/user" },
      "leaderboardRank": 12
    }
  ],
  "nextCursor": "leaderboard_doc_id"
}

## Index Requirements

- studentLeaderboard: totalScore DESC
- studentLeaderboard: collegeId ASC + totalScore DESC
- studentLeaderboard: categoryScores.academic DESC
- studentLeaderboard: categoryScores.sports DESC
- studentLeaderboard: categoryScores.cultural DESC

## Security Rules Outline (Conceptual)

- Recruiters are read-only.
- Only verified students are returned.
- No direct recruiter access to users collection.

## Scalability Notes

- Reads are bounded by strict limit (max 50).
- Cursor pagination avoids offset scans.
- Leaderboard denormalization supports fast sorting.
