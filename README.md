# StudyMate

StudyMate is a full-stack academic peer-matching, real-time messaging, and study-session scheduling web application built with React, TypeScript, Tailwind CSS, and Firebase.

## Architecture & Folder Structure

- `src/components/` — Reusable UI primitives (`Avatar`, `ErrorBoundary`, `LoadingSkeleton`, `ProtectedRoute`), layout (`AppShell`), and workflow modals (`CreateSessionModal`, `PartnerProfileModal`, `CreateGroupModal`).
- `src/contexts/` — Global state providers for Authentication (`AuthContext`), Light/Dark theme (`ThemeContext`), and accessible toast notifications (`ToastContext`).
- `src/hooks/` — Real-time Firestore workspace subscription hook (`useWorkspaceData`) including 30-minute upcoming session reminder checks.
- `src/pages/` — Public (`LandingPage`, `LoginPage`, `SignupPage`), onboarding (`OnboardingPage`), and protected workspace screens (`DashboardPage`, `FindPartnersPage`, `ChatPage`, `SchedulePage`, `StudyGroupsPage`, `ProfilePage`, `SettingsPage`).
- `src/services/` — Firebase initialization & error handling (`firebase.ts`), Firestore & Storage CRUD (`firestoreService.ts`), and sample partner/workspace seeding (`seedData.ts`).
- `src/utils/` — Compatibility match % algorithm, overlapping availability slot calculator, and session conflict detector (`matching.ts`).
- `src/types/` — Shared TypeScript domain interfaces (`index.ts`).

## Setup Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Firebase configuration**:
   - The app reads Firebase configuration from `firebase-applet-config.json` in the project root (`projectId`, `apiKey`, `authDomain`, `firestoreDatabaseId`, `storageBucket`).
   - **Enable Authentication Providers**:
     - Google Sign-In is ready by default.
     - To use Email/Password sign-up, login, password reset, and password change, open your Firebase Console → **Authentication** → **Sign-in method** → enable **Email/Password**.

3. **Environment variables**:
   - Copy `.env.example` if deploying outside AI Studio (`GEMINI_API_KEY`, `APP_URL`). Firebase web credentials live in `firebase-applet-config.json`.

4. **Firestore Security Rules**:
   - Rules are defined in `firestore.rules` and schema blueprints in `firebase-blueprint.json`.
   - Deploy rules via Firebase CLI (`firebase deploy --only firestore:rules`) or AI Studio `DeployRules`.

5. **Run locally & build**:
   ```bash
   npm run dev     # Starts Vite dev server on port 3000
   npm run lint    # TypeScript type-check (tsc --noEmit)
   npm run build   # Production bundle into dist/
   ```

## Suggested Future Enhancements

- **Video Study Rooms**: Built-in WebRTC / LiveKit audio-video rooms with shared Pomodoro timers inside scheduled sessions.
- **Google Calendar Two-Way Sync**: Export accepted StudyMate sessions directly to Google Calendar via OAuth.
- **Shared Flashcard Decks & Notes**: Collaborative Markdown notes and spaced-repetition flashcards linked to each Study Group.
- **Push Notifications**: Firebase Cloud Messaging (FCM) background reminders for mobile/desktop browsers.
