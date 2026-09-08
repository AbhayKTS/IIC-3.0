# CollegeVerse Phase 10 - Placement & Recruiter Hiring Module

This document captures the Phase 10 hiring pipeline and data model.

## Collections

- companies
- jobPosts
- jobApplications

## companies Schema

{
  "companyId": "company_123",
  "name": "TalentHive",
  "createdBy": "uid_recruiter",
  "verifiedStatus": "verified",
  "createdAt": "2026-02-15T10:00:00.000Z"
}

## jobPosts Schema

{
  "jobId": "job_123",
  "companyId": "company_123",
  "title": "Backend Intern",
  "description": "Build APIs and services",
  "jobType": "internship",
  "eligibleColleges": ["college_001", "college_002"],
  "minimumScore": 120,
  "requiredSkills": ["Node.js", "PostgreSQL"],
  "status": "open",
  "applicationDeadline": "2026-04-01T23:59:59.000Z",
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:00:00.000Z"
}

## jobApplications Schema

{
  "applicationId": "job_123_uid_001",
  "jobId": "job_123",
  "userId": "uid_001",
  "collegeId": "college_001",
  "applicationStatus": "applied",
  "appliedAt": "2026-02-16T10:00:00.000Z",
  "updatedAt": "2026-02-16T10:00:00.000Z",
  "studentSnapshot": {
    "totalScore": 210,
    "skills": ["Node.js", "PostgreSQL"]
  }
}

## Endpoints

Recruiter:
- POST /api/v1/recruiter/jobs
- POST /api/v1/recruiter/jobs/:jobId/shortlist/:applicationId
- GET /api/v1/recruiter/jobs/:jobId/applications

Student:
- POST /api/v1/student/jobs/:jobId/apply
- GET /api/v1/student/applications

## Validation & Integrity

- Only verified students can apply.
- Deadline and eligibility enforced.
- One application per student per job.
- Recruiter can only modify their job posts.
- Student profile snapshot stored at apply time.

## Indexes

- jobPosts: status ASC
- jobPosts: eligibleColleges ASC
- jobApplications: jobId ASC + applicationStatus ASC
- jobApplications: userId ASC
- jobApplications: jobId ASC + collegeId ASC

## Security Rules Outline (Conceptual)

- Students cannot update applicationStatus.
- Recruiters can only update jobs they own.
- Clients cannot write to jobApplications directly.
- Verified students only for apply endpoints.
