# Deployment Guide

## Environments
- development
- staging
- production

## Configuration
- Env files: .env.development, .env.staging, .env.production
- Template: [.env.example](../.env.example)

## CI/CD
- GitHub Actions workflow: [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)
- Staging deploy on dev branch
- Production deploy on main branch

## Health Checks
- GET /health
- GET /api/v1/status

## Rollback
- Tag releases and redeploy previous tag
- Reapply previous Firestore rules file

## Socket.io Scaling
- Single instance or sticky sessions
- Use a shared adapter before horizontal scaling
