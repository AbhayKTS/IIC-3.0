# Security

## Auth
- Firebase Auth ID tokens verified on protected routes.
- Email verification is required.

## Authorization
- Role-based access enforced via middleware.
- Verified student checks for protected student routes.

## Rate Limiting
- Global rate limiting on API.
- Recruiter search has a stricter limiter.

## Data Protection
- Firestore rules are environment-specific and default deny.
- Service accounts and secrets are provided via env vars.
