# Almadox 🎓

> **A trusted layer for campus life.**
> Identity is only the beginning. Almadox turns verification into access—to work, commerce, talent, and recognition.

Almadox (formerly CollegeVerse) is a unified campus ecosystem that connects students, faculty, and recruiters through verified identity. By utilizing College ID and facial verification, Almadox creates a bot-free environment where credentials, work, and recognition collect in a non-transferable wallet that recruiters and peers can trust.

## Features ✨

- **Verified Identity & SBT Wallet:** Your achievements, permanently yours. Secure, non-transferable SBT records built on verified outcomes.
- **MicroGigs:** Small tasks, real earnings. Complete short projects for verified campus teams and recruiters to earn money and build a proof-of-work record.
- **Campus Marketplace:** Trade inside a trusted circle. Buy and sell books, devices, and essentials safely with verified peers from your college community.
- **Live Leaderboards:** Recognition built on contribution. Discover rising students and high-performing colleges through transparent rankings shaped by verified work and impact.
- **Azure AI Document Intelligence OCR:** Automated college ID card scanning and verification.
- **Resume Parsing & Skill Deduplication:** Two-step pipeline using Azure Document Intelligence and Azure OpenAI with automated rule-based fallback.

## Architecture & Stack 🏗️

The project is structured into clean separate folders:
- **`backend/`**: Node.js + Express API, Vercel Serverless Function (`api/index.js`), Firebase Admin SDK, Azure Document Intelligence, Azure OpenAI, Jest test suites.
- **`frontend/`**: React + TypeScript + Vite, Tailwind CSS, Shadcn UI, Firebase Web Client.

## Getting Started 🚀

### 1. Root Commands
- Install all dependencies:
  ```bash
  npm run install:all
  ```
- Build frontend:
  ```bash
  npm run build
  ```
- Run backend tests:
  ```bash
  npm test
  ```

### 2. Backend Setup
1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install --legacy-peer-deps`
3. Copy `.env.example` to `.env` and fill in Firebase and Azure configuration.
4. Start development server: `npm start`

### 3. Frontend Setup
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Start Vite dev server: `npm run dev` (runs at `http://localhost:5173`)

## SuperAdmin Setup & Seeding
CollegeVerse provides platform-level administrative capabilities under the `platformRole: 'superAdmin'` flag.
- To seed a default superAdmin account:
  ```bash
  cd backend && npm run seed:superadmin
  ```
- Optional environment variables:
  - `SUPERADMIN_EMAIL` (default: `superadmin@collegeverse.internal`)
  - `SUPERADMIN_PASSWORD` (default: `SuperAdmin123!`)
  - `SUPERADMIN_NAME` (default: `Super Administrator`)

## Deployment
- **Frontend:** Hosted on Firebase Hosting (`npm run build && npx firebase deploy --only hosting`).
- **Backend:** Ready for Vercel Serverless via `backend/api/index.js` and `vercel.json` or Render via `backend/src/server.js`.

---
*© 2026 Almadox. All rights reserved.*
