# CollegeVerse Phase 5 - Student Profile System & Resume Architecture

This document captures the Phase 5 student profile schema and access model.

## Firestore Schema (studentProfiles)

Document: studentProfiles/{userId}

{
  "userId": "uid_123",
  "collegeId": "college_001",
  "enrollmentYear": 2023,
  "branch": "CSE",
  "bio": "Backend-focused final year student",
  "skills": ["Node.js", "PostgreSQL", "Firebase"],
  "softSkills": ["Teamwork", "Communication"],
  "codingProfiles": {
    "github": "https://github.com/user",
    "leetcode": "https://leetcode.com/user",
    "codeforces": null,
    "codechef": null,
    "linkedin": "https://linkedin.com/in/user"
  },
  "education": [
    {
      "degree": "B.Tech",
      "field": "CSE",
      "college": "ABC Institute of Technology",
      "startYear": 2023,
      "endYear": 2027
    }
  ],
  "projects": [
    {
      "title": "CollegeVerse API",
      "description": "Role-based backend skeleton",
      "stack": ["Node.js", "Firestore"],
      "link": "https://github.com/collegeverse"
    }
  ],
  "experience": [
    {
      "role": "Backend Intern",
      "company": "TalentHive",
      "start": "2025-06",
      "end": "2025-12",
      "summary": "Worked on API design."
    }
  ],
  "certifications": [
    {
      "title": "AWS Cloud Practitioner",
      "issuer": "Amazon",
      "year": 2025
    }
  ],
  "achievementsCount": 0,
  "leaderboardScore": 0,
  "profileVisibility": "public",
  "createdAt": "2026-02-15T10:00:00.000Z",
  "updatedAt": "2026-02-15T10:00:00.000Z"
}

## Access Rules

- Students can create/update their own profile only.
- leaderboardScore is server-controlled.
- Recruiters read-only access to verified students.
- Faculty read-only access to students in same college.

## API Endpoints

Student:
- POST /api/v1/student/profile
- PUT /api/v1/student/profile
- GET /api/v1/student/profile

Recruiter:
- GET /api/v1/recruiter/student/:id

Faculty:
- GET /api/v1/faculty/student/:id

## Validation Rules

- Limit counts:
  - skills: 30
  - softSkills: 20
  - projects: 15
  - experience: 15
  - certifications: 20
- Validate coding profile URLs.
- Ignore client-provided leaderboardScore and achievementsCount.

## Firestore Indexes

- studentProfiles: collegeId ASC
- studentProfiles: leaderboardScore DESC
- studentProfiles: collegeId ASC + leaderboardScore DESC

## Security Rules Outline (Conceptual)

- Students can write only their profile doc when request.auth.uid == userId.
- leaderboardScore and achievementsCount are immutable by clients.
- Recruiters are read-only for verified students only.
- Faculty are read-only for students in same college.
