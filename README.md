# Almadox 🎓

> **A trusted layer for campus life.**
> Identity is only the beginning. Almadox turns verification into access—to work, commerce, talent, and recognition.

Almadox (formerly CollegeVerse) is a unified campus ecosystem that connects students, faculty, and recruiters through verified identity. By utilizing College ID and facial verification, Almadox creates a bot-free environment where credentials, work, and recognition collect in a non-transferable wallet that recruiters and peers can trust.

## Features ✨

- **Verified Identity & SBT Wallet:** Your achievements, permanently yours. Secure, non-transferable SBT records built on verified outcomes.
- **MicroGigs:** Small tasks, real earnings. Complete short projects for verified campus teams and recruiters to earn money and build a proof-of-work record.
- **Campus Marketplace:** Trade inside a trusted circle. Buy and sell books, devices, and essentials safely with verified peers from your college community.
- **Live Leaderboards:** Recognition built on contribution. Discover rising students and high-performing colleges through transparent rankings shaped by verified work and impact.

## Architecture & Stack 🏗️

Almadox is built as a modern, full-stack application:

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS, Framer Motion (dynamic animations, glassmorphism)
- **Routing:** React Router DOM
- **Icons:** Lucide React

### Backend
- **Framework:** Node.js + Express
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Real-time & Services:** Socket.io, Firebase Admin SDK
- **Observability:** Winston Logging, Sentry

## Getting Started 🚀

### 1. Backend Setup
1. Navigate to the root directory.
2. Install dependencies: `npm install`
3. Copy the `.env.example` to `.env` and fill in your Firebase and configuration values.
4. Ensure Firebase emulators or your production Firebase project is configured correctly in `firebase.json`.
5. Start the API server: `npm run start`

### 2. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`
4. Visit the app at `http://localhost:5173`.

## Documentation 📚

- **Architecture:** [docs/architecture.md](docs/architecture.md)
- **Collections:** [docs/collections.md](docs/collections.md)
- **Role Access Matrix:** [docs/role-access-matrix.md](docs/role-access-matrix.md)
- **API Overview:** [docs/api-overview.md](docs/api-overview.md)
- **Deployment:** [docs/deployment.md](docs/deployment.md)

## Testing 🧪

To run the integration tests against the Firebase emulators:
```bash
# Start Emulators
./scripts/emulator-setup.sh

# Run Tests
npm run test:integration
```

## Contributing 🤝

We welcome contributions! Please follow our established linting rules and ensure all tests pass before submitting a pull request.

---
*© 2026 Almadox. All rights reserved. Built by students.*
