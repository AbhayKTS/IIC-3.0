# Role Access Matrix

## Roles
- Student
- Faculty
- AdminFaculty (Faculty with subRole=admin)
- Recruiter

## Student
Allowed:
- /api/v1/auth/bootstrap
- /api/v1/student/*
- /api/v1/events (GET)
- /api/v1/user/notifications*
- /api/v1/user/communities/*
- /api/v1/communities/:id/messages (GET)

Restricted:
- /api/v1/faculty/*
- /api/v1/admin/*
- /api/v1/recruiter/*

## Faculty
Allowed:
- /api/v1/faculty/*
- /api/v1/events (GET)
- /api/v1/communities/:id/messages (GET)

Restricted:
- /api/v1/admin/* (unless AdminFaculty)
- /api/v1/recruiter/*

## AdminFaculty
Allowed:
- /api/v1/admin/*
- /api/v1/faculty/*
- /api/v1/events (GET)

Restricted:
- /api/v1/recruiter/*

## Recruiter
Allowed:
- /api/v1/recruiter/*
- /api/v1/events (GET)

Restricted:
- /api/v1/student/*
- /api/v1/faculty/*
- /api/v1/admin/*

## Notes
- Verified student check applies to select student routes (events, clubs, teams, jobs, communities).
- Token verification + user profile attach is required for all protected routes.
