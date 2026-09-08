# CollegeVerse Phase 4 - College Domain Mapping & Verification Pipeline

This document captures the Phase 4 backend onboarding and verification flow.

## College Domain Mapping

- colleges collection adds:
  - collegeId
  - name
  - domain (email domain)
  - isActive
  - createdAt

Domain validation rules:
- Extract domain from email.
- Match domain against colleges where isActive == true.
- Reject registration if no match.
- Reject if multiple colleges share the same domain.

## Student Onboarding Logic

On first login (backend controlled):
1. Verify Firebase token and email verification.
2. Extract email domain.
3. Resolve college by domain.
4. If matched:
   - role = student
   - collegeId = matched collegeId
   - verificationStatus = pending
5. If no match: reject with college_domain_invalid.

Frontend never sends collegeId or role.

## Faculty Verification Queue

Query used by faculty dashboard:
- users where role == student
- collegeId == faculty.collegeId
- verificationStatus == pending

## Faculty Verification Endpoint

POST /api/v1/faculty/verify-student

Request body:
{
  "studentId": "uid_123",
  "status": "verified"
}

Rules:
- Only faculty role.
- Same college required.
- status must be verified or rejected.

Updates on user:
- verificationStatus
- verifiedBy
- verificationTimestamp
- updatedAt

## Audit Logging

Each verification writes an auditLogs document:
{
  "actionType": "student_verification",
  "performedBy": "uid_faculty",
  "targetUserId": "uid_student",
  "collegeId": "college_001",
  "timestamp": "2026-02-15T12:30:00.000Z"
}

## Access Restriction

Unverified students can access profile only.
All restricted modules must use requireVerifiedStudent middleware:
- events
- clubs
- placements
- leaderboard
- community

## Firestore Indexes (Composite)

- users: collegeId ASC, verificationStatus ASC
- users: role ASC, collegeId ASC

## Security Rules Outline (Conceptual)

- Students cannot update verificationStatus.
- Only faculty can update verificationStatus.
- Faculty limited to same college.
- College domain immutable to normal users.
