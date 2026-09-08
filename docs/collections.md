# Collections Reference

This document reflects current collection usage in controllers and services.

## users
- Schema: uid, email, role, subRole, collegeId, verificationStatus, schemaVersion, createdAt, updatedAt
- Reads: user profile lookups, role checks
- Writes: user creation on bootstrap, admin faculty creation
- Versioning: schemaVersion defaults to 1

## studentProfiles
- Schema: userId, collegeId, profileVisibility, skills, categoryScores, totalScore, overallScore, schemaVersion, createdAt, updatedAt
- Reads: student profile access, recruiter view
- Writes: create/update profile, score updates
- Versioning: schemaVersion defaults to 1, overallScore fallback to totalScore

## studentLeaderboard
- Schema: userId, collegeId, totalScore, overallScore, categoryScores, searchableSkills, isVerified, cachedRank, schemaVersion, updatedAt
- Reads: recruiter search, leaderboard queries
- Writes: profile creation, score updates, verification updates
- Versioning: schemaVersion defaults to 1

## collegeLeaderboard
- Schema: collegeId, totalCollegeScore, totalStudents, averageScore, rankNational, updatedAt
- Reads: leaderboard aggregation
- Writes: recalculated from studentLeaderboard

## events
- Schema: eventId, title, description, category, collegeId, createdBy, startDate, endDate, registrationDeadline, maxParticipants, isTeamEvent, status, participantsCount, createdAt, updatedAt
- Reads: list events
- Writes: faculty creation, student registration updates

## teams
- Schema: teamId, eventId, collegeId, teamName, createdBy, maxMembers, currentMembersCount, status, createdAt, updatedAt
- Reads: team membership checks
- Writes: create team, join requests, approvals

## clubs
- Schema: clubId, collegeId, name, nameLower, description, category, createdBy, approvedBy, status, membersCount, schemaVersion, createdAt, updatedAt
- Reads: approval and membership flows
- Writes: apply/approve/reject/update
- Versioning: schemaVersion defaults to 1

## jobPosts
- Schema: jobId, companyId, title, description, jobType, eligibleColleges, minimumScore, requiredSkills, status, applicationDeadline, schemaVersion, createdAt, updatedAt
- Reads: recruiter listings, student eligibility checks
- Writes: recruiter create/update
- Versioning: schemaVersion defaults to 1

## jobApplications
- Schema: applicationId, jobId, userId, collegeId, applicationStatus, appliedAt, updatedAt, studentSnapshot
- Reads: recruiter shortlist, student list
- Writes: student apply, recruiter updates

## communities
- Schema: communityId, collegeId, name, description, type, createdBy, visibility, membersCount, schemaVersion, createdAt, updatedAt
- Reads: community access checks
- Writes: faculty/student community creation
- Versioning: schemaVersion defaults to 1

## messages
- Schema: messageId, communityId, senderId, senderName, content, createdAt, isFlagged
- Reads: community messages
- Writes: socket message send

## notifications
- Schema: notificationId, userId, type, title, message, referenceId, isRead, createdAt
- Reads: user notifications
- Writes: event/club/verification workflows

## analyticsSnapshots
- Schema: snapshotId, snapshotType, collegeId, totals, averageScore, createdAt
- Reads: analytics views
- Writes: snapshot generation

## auditLogs
- Schema: logId, actionType, performedBy, performedByRole, targetId, targetType, collegeId, metadata, createdAt
- Reads: admin/faculty audit views
- Writes: system and admin actions

## platformStats / collegeStats
- Schema: counters for totals, totalScoreSum, totalScoreCount
- Reads: analytics endpoints
- Writes: incremental counter updates

## metricsLogs
- Schema: route, method, statusCode, responseTimeMs, userRole, createdAt
- Reads: observability dashboards
- Writes: request metrics middleware

## Firestore Rules
- Environment-specific rules files are present and currently default to deny all:
  - [firestore.rules.dev](../firestore.rules.dev)
  - [firestore.rules.staging](../firestore.rules.staging)
  - [firestore.rules.prod](../firestore.rules.prod)

## Index Notes
Recommended composite indexes (based on queries):
- metricsLogs: createdAt desc
- metricsLogs: route + createdAt
- studentLeaderboard: collegeId + totalScore desc
- studentLeaderboard: totalScore desc
- events: collegeId + status + startDate
- clubs: collegeId + nameLower
- communities: collegeId + type
- jobApplications: collegeId + jobId
