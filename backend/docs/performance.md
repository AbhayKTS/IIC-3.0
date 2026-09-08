# Performance

## Caching
- LRU cache for analytics stats and leaderboard results.

## Counters
- platformStats and collegeStats track incremental counts.

## Query Optimization
- Denormalized fields for recruiter search (searchableSkills, cachedRank).
- Avoids cross-collection joins where possible.

## Observability
- metricsLogs capture response time and error rates.
- Slow query logging for recruiter search and leaderboards.
