# Phase 18: Performance Optimization & Caching Strategy

## Goals
- Replace expensive scans with incremental counters.
- Cache frequently requested analytics and leaderboard data.
- Reduce recruiter search joins by denormalizing search fields.
- Add guardrails for pagination and input validation.

## Key Changes
- Introduced incremental counters in `platformStats` and `collegeStats`.
- Added an in-memory LRU cache for analytics stats and leaderboard entries.
- Denormalized `searchableSkills`, `isVerified`, and `cachedRank` into `studentLeaderboard`.
- Updated analytics endpoints to read cached stats instead of scanning collections.
- Tightened recruiter search to use `studentLeaderboard` fields only.

## Collections
### platformStats (doc: `platform`)
Example fields:
- `totalUsers`
- `totalStudents`
- `totalVerifiedStudents`
- `totalColleges`
- `totalEvents`
- `totalClubs`
- `totalTeams`
- `totalJobs`
- `totalApplications`
- `totalScoreSum`
- `totalScoreCount`

### collegeStats (doc: `{collegeId}`)
Example fields:
- `totalStudents`
- `totalVerifiedStudents`
- `totalEvents`
- `totalClubs`
- `totalTeams`
- `totalJobs`
- `totalApplications`
- `totalScoreSum`
- `totalScoreCount`

### studentLeaderboard (doc: `{studentId}`)
Additional fields:
- `searchableSkills`: lowercased array for recruiter search
- `isVerified`: verification state for filtering
- `cachedRank`: last computed rank (optional)

## Services
- `src/services/stats.service.js`
  - `incrementPlatformStats()`
  - `incrementCollegeStats()`
- `src/utils/cache.js`
  - LRU cache with TTL for analytics and leaderboards
- `src/services/analytics.service.js`
  - `getPlatformStats()` and `getCollegeStats()` now return cached stats and computed `averageScore`

## Updated Flows
- Student profile creation and score updates increment `totalScoreCount/totalScoreSum`.
- Faculty verification increments `totalVerifiedStudents` and syncs `isVerified` on leaderboard.
- Events, clubs, teams, jobs, and applications increment relevant counters.
- Admin/faculty analytics reads use cached stats.

## Guardrails
- Recruiter search enforces max page size and validates `minScore`.
- Leaderboard and analytics cache invalidation on write paths.

## Validation Checklist
- Verify counters increment on all create/verify flows.
- Confirm cache invalidation on leaderboard updates.
- Ensure recruiter search uses only leaderboard data.
- Validate analytics responses include `averageScore`.
