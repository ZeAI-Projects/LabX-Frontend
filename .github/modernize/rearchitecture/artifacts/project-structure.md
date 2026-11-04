# Project Structure

## Classification

- **Project type:** Frontend single-page application (SPA).
- **Runtime:** Browser; Vite is used for development and production bundling.
- **Repository shape:** One frontend application, not a monorepo.
- **Observed behavior:** Authentication, assessments, projects, roadmaps, companion chat, events, achievements, and profile workflows use browser-local demo data. The inspected source has no backend/API client or server application.

## Modules and Layers

| Area | Files | Responsibility |
|---|---:|---|
| `src/features/` | 138 | Feature slices, each generally organized into `pages/`, `components/`, `services/`, and sometimes `hooks/`, `context/`, `assets/`, or `validation/`. |
| `src/components/` | 27 | Shared layout, navigation, error handling, onboarding, and common UI. |
| `src/assets/` | 6 | Shared images, icons, and font placeholders. |
| `src/styles/` | 4 | Global CSS variables, base styles, and application-wide refinements. |
| `src/app/` | 3 | Application composition, providers, and route table. |
| `src/services/` | 3 | Browser storage adapter and API placeholder directory. |
| `src/utils/` | 3 | Cross-feature onboarding and role helpers. |
| `src/hooks/` | 2 | Shared authentication hook and placeholder. |
| `src/main.jsx` | 1 | Browser entrypoint; mounts React and loads global styles. |
| `src/constants/`, `src/types/` | 1 each | Empty placeholders. |

The repository contains 189 files under `src/` (including styles, images, placeholders, and other non-code assets). Feature folder counts include their nested files.

## Functional Areas

- **Authentication and onboarding:** registration, email-code verification, login, password recovery, role onboarding, and founder assessment setup.
- **Assessment and projects:** per-project assessment drafts, result review, project creation, renaming, deletion, and project list.
- **Roadmaps and collaboration:** mission workflows, evidence submissions/reviews, shared roadmaps, invitations, team membership, and joined-roadmap views.
- **Dashboard and recognition:** dashboard snapshots, daily quests, achievement activity, and leaderboard.
- **Opportunities:** event listings, registrations, reminders, outcomes, and reports.
- **Profile:** personal profile, privacy controls, profile media, and founder passport/application records.
- **Companion:** Sharp chat, chat history, contextual project navigation, and companion dock.
- **Shared shell:** route protection, navigation, onboarding layout, error boundary, global style system, and common display components.

## Entry Points and Configuration

- `index.html` supplies the `#root` mount node and loads `/src/main.jsx`.
- `src/main.jsx` imports Inter font weights and global styles, then mounts `<App />` using React DOM `createRoot` inside `StrictMode`.
- `src/app/App.jsx` composes `BrowserRouter`, global providers, error boundary, cipher screen, companion provider, routes, and companion dock.
- `src/app/router.jsx` lazy-loads page components and defines public, protected onboarding, protected application, compatibility, and fallback routes.
- `vite.config.js` enables the React Vite plugin; no custom server or proxy is configured.
- `package.json` defines Vite dev/build/preview, ESLint, Node test, and browser-flow test scripts.
- `eslint.config.js` is the project lint configuration.

## Source Counts

The source file inventory is based on the checked-out `src/` tree. It is not a count of runtime-loaded modules; route pages are lazy-loaded.
