# Coding Profiles Integration (LeetCode & Codeforces)

## 1. Overview
The Coding Profiles module in CollegeVerse (IIC 3.0) allows students to link their public LeetCode username and Codeforces handle. The backend is the sole authority for fetching, deduplicating, aggregating, and storing verified statistics. The frontend never makes direct client-side requests to third-party providers, nor are passwords or platform tokens ever requested or stored.

---

## 2. Connecting Profiles

### LeetCode
- **Input**: Public username (e.g., `lee215`, `ansh_codr`).
- **Validation**: 1–30 alphanumeric characters, underscores, and hyphens (`^[a-zA-Z0-9_-]{1,30}$`). Arbitrary URLs are strictly rejected to prevent SSRF.
- **Constructed Profile URL**: `https://leetcode.com/u/{username}/`

### Codeforces
- **Input**: Public handle (e.g., `tourist`, `ansh_dev`).
- **Validation**: 2–32 alphanumeric characters, underscores, dots, and hyphens (`^[a-zA-Z0-9_.-]{2,32}$`).
- **Constructed Profile URL**: `https://codeforces.com/profile/{handle}`

---

## 3. Statistics Collected & Normalized

### LeetCode Data
- `totalSolved`: Total accepted unique problems solved.
- `easy`, `medium`, `hard`: Problems solved per official difficulty tier.
- `languages`: Dictionary mapping programming language names to problem counts.
- `skills`: Topic/tag counts aggregated across fundamental, intermediate, and advanced categories.
- `fetchedAt`: ISO 8601 timestamp of last query.
- `status`: `'connected'` | `'error'` | `'not_connected'`.

### Codeforces Data
- `rating`: Current contest rating.
- `maxRating`: Peak career contest rating.
- `rank`: Current competitive rank (e.g., *pupil*, *specialist*, *expert*, *master*, *grandmaster*).
- `maxRank`: Career peak rank.
- `totalSolved`: Deduplicated count of unique accepted problems (`verdict === "OK"`).
- `ratingBuckets`: Problems solved bucketed by official problem rating (`<1000`, `1000-1199`, `1200-1399`, `1400-1599`, `1600-1799`, `1800-1999`, `2000+`, `Unrated`).
- `tags`: Tag frequency map (e.g. `dp: 42`, `graphs: 31`, `greedy: 28`).
- `languages`: Languages used for accepted submissions.
- `contests`: Number of participated and rated contests.
- `fetchedAt`: ISO 8601 timestamp of last query.
- `status`: `'connected'` | `'error'` | `'not_connected'`.

---

## 4. Why Codeforces Solved-by-Topic is Calculated Server-Side
Codeforces official REST API does not provide a single pre-aggregated "solved by category" field. Instead, the backend:
1. Fetches all submissions from `GET https://codeforces.com/api/user.status?handle={handle}`.
2. Filters exclusively for accepted solutions where `verdict === "OK"`.
3. Deduplicates problems by `contestId_index` (e.g., `100_A`). Multiple accepted submissions for the exact same problem are counted only **once** toward `totalSolved`.
4. Examines each solved problem's `problem.tags`.
5. A single problem can belong to multiple categories (e.g., `tags = ["dp", "graphs"]`). Each tag counter increments, while the problem itself is counted only once in `totalSolved`.
6. Inspects `problem.rating` to classify the problem into the appropriate rating bucket.

---

## 5. Third-Party Limitations & Provider Resilience

### LeetCode Provider Limitations
- LeetCode does not have an open, stable REST API specification with rate limit headers.
- Queries are executed against LeetCode's public GraphQL endpoint (`https://leetcode.com/graphql`) with strict timeouts (8000ms).
- If LeetCode returns an error indicating that the user does not exist, the profile is marked with `status: "error"` and code `LEETCODE_PROFILE_NOT_FOUND`.
- If LeetCode is temporarily down, existing cached statistics are retained, and the dashboard continues to display gracefully.

### Codeforces Provider Limitations
- Codeforces enforces an API rate limit of roughly 5 requests per second.
- Timeouts (8000ms) prevent slow responses from blocking student requests.
- Rate-limiting (HTTP 429) triggers `CODEFORCES_RATE_LIMIT` and does not overwrite existing data.

### Partial Failure Isolation
If LeetCode succeeds but Codeforces fails (or vice versa):
- The successful provider's data is persisted as `status: "connected"`.
- The failing provider records `status: "error"` without overwriting or clearing previous successful statistics.

---

## 6. Caching & Refresh Schedule
- **Cache TTL**: Default 1 hour (`60 * 60 * 1000` ms), configurable via `process.env.CODING_PROFILE_CACHE_TTL_MS`.
- **Dashboard Load**: Returns cached Firestore data if `Date.now() - Date.parse(fetchedAt) < TTL`.
- **Manual Refresh**: Explicitly clicking **Refresh** or submitting new handles bypasses TTL cache (`forceRefresh: true`).

---

## 7. API Endpoints

### 1. Update / Connect Handles
```http
PUT /api/v1/student/coding-profiles
Authorization: Bearer <Firebase_ID_Token>
Content-Type: application/json

{
  "leetcodeUsername": "ansh_codr",
  "codeforcesHandle": "ansh_dev"
}
```

### 2. Get Stored Profiles
```http
GET /api/v1/student/coding-profiles
Authorization: Bearer <Firebase_ID_Token>
```

### 3. Force Refresh Statistics
```http
POST /api/v1/student/coding-profiles/refresh
Authorization: Bearer <Firebase_ID_Token>
```

---

## 8. Firestore Schema

Path: `studentProfiles/{studentId}` and `users/{studentId}`
```json
{
  "codingProfiles": {
    "leetcode": {
      "username": "ansh_codr",
      "profileUrl": "https://leetcode.com/u/ansh_codr/",
      "fetchedAt": "2026-09-08T20:00:00.000Z",
      "totalSolved": 350,
      "easy": 120,
      "medium": 180,
      "hard": 50,
      "languages": { "C++": 200, "Python": 150 },
      "skills": { "Dynamic Programming": 45, "Graphs": 25 },
      "source": "public_profile",
      "status": "connected",
      "error": null
    },
    "codeforces": {
      "handle": "ansh_dev",
      "profileUrl": "https://codeforces.com/profile/ansh_dev",
      "fetchedAt": "2026-09-08T20:00:00.000Z",
      "rating": 1520,
      "maxRating": 1640,
      "rank": "specialist",
      "maxRank": "expert",
      "totalSolved": 210,
      "ratingBuckets": {
        "<1000": 45,
        "1000-1199": 65,
        "1200-1399": 50,
        "1400-1599": 35,
        "1600-1799": 15,
        "1800-1999": 0,
        "2000+": 0,
        "Unrated": 0
      },
      "tags": { "greedy": 60, "math": 50, "dp": 40 },
      "languages": { "GNU C++17": 190, "Python 3": 20 },
      "contests": { "participated": 18, "rated": 18 },
      "source": "official_api",
      "status": "connected",
      "error": null
    }
  },
  "codingSkillEvidence": {
    "dynamic programming": 85,
    "graphs": 40,
    "greedy": 60,
    "algorithms": 42
  }
}
```

---

## 9. Job Matching & n8n Integration
- **Job Matching**: Students with verified problem counts in relevant categories (e.g., dynamic programming, algorithms, graphs) receive supporting evidence tags and match score enhancements (up to +5% capped at 100%) for matching technical roles.
- **n8n Webhook / Internal API**: `GET /api/v1/internal/student/:studentId` automatically returns `codingProfiles` and `codingSkillEvidence` so downstream n8n orchestration pipelines can factor in live coding competence.
