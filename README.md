# LabX frontend

JavaScript + React/Vite frontend with registration, login, project assessments, dashboard, multiple project roadmaps, shared navigation, achievements, and events. The original Sample FE visual style, welcome video, hologram, particles, sounds, cards, and responsive layouts are retained.

The latest agreed workflow takes precedence over the earlier PDF's skip-to-Q1 routing. The completion card follows the supplied screenshot. All accounts, progress, and roadmap data are browser-local mocks; no API, backend, or email service is required.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. Fonts and media are served locally. Demo login: `founder@labx.demo` / `Demo1234!`, available from **Use demo credentials** on Login.

## Projects and founder workflow

1. On a signed-out visit, the logo animation opens Registration. The form tabs are **Register** and **Login**. The animation can be skipped; reduced-motion preferences bypass it.
2. Founder registration opens **New project**. Enter a project name (required, up to 100 characters), then **Start assessment** opens the seven-question assessment for that project.
3. Every project has independent answers, saved progress, assessment results, and a roadmap. **Save and exit** returns to the project grid; resume a draft from its card anytime.
4. Login opens the dashboard, which shows project, ready-roadmap, and unfinished-assessment counts.
5. **Projects** in navigation and **View projects** on the dashboard open the project grid at `/roadmap`. The grid shows six projects per page, creator, creation date, status, and the domain/stage/level of completed roadmaps. **New project** at the top begins the name-first flow.
6. **Edit** changes the project name only. **Delete** asks for confirmation before removing that project, its answers, and its roadmap. Cancel and Escape leave it intact. Page numbers adjust after deletion.
7. Completing a project's assessment shows **Your LABX Starting Point** with its name, domain, stage, starting level, guild, and **Enter My Roadmap**. Completed answers stay locked. **All projects** returns to the grid.

Project routes are `/roadmap/:projectId/assessment`, `/roadmap/:projectId/result`, and `/roadmap/:projectId`. A draft cannot open its roadmap until its own assessment is complete. Missing, deleted, and other-account projects show a not-found message; mentors remain restricted to their existing flow. The old `/assessment` link opens New project; `/assessment/result` opens the first completed result or the grid.

Existing completed account assessments migrate once into **My first project**. Existing unfinished assessment answers transfer to the first named project. Deleting a migrated project does not recreate it on refresh. Project data persists per account in this browser and does not synchronize to a server.

Stage **Launch** and **Level 5** are approved illustrative values matching the screenshot, not a scoring algorithm. Domain and guild reflect the user's actual selection. Earlier pending mock results migrate to this sample placement while retaining completed answers.

## Navbar, achievements, and events

These screens follow the original `Sample FE/frontend` components and the navigation/achievements/events sections of `LabX_Attributes_updated.pdf`.

- **Shared navigation:** the original sidebar, brand, account footer, coin animation, and mobile navigation. The selected destination is highlighted. Branding has no navigation action. Avatar/name opens Profile; Sign out immediately opens Login. The X coin control reveals the balance on hover, keyboard focus, or tap. The bell opens Notifications.
- **Roles:** Founder navigation includes Dashboard, Projects, Leaderboard, Guilds, Social, Events, Achievements, and Profile. Mentors see Dashboard, Events, Achievements, and Profile; founder-only direct routes are restricted. Each project requires its own assessment to open its roadmap; the project grid is always available to founders.
- **Achievements:** summary, All/Earned/Locked filters, badge details/criteria/dates, progress, recent transactions, and read-only Points History. The built-in demo account has 450 approved points and three earned badges; another 100 pending points are excluded. Other accounts start with zero points and no earned badges. This illustrative ledger never changes assessment or roadmap progress. Navbar Coins and the Achievements Points balance use the same non-cash value; there is no withdrawal or redemption.
- **Events:** search, category/format filters, date sorting, Upcoming/My Events/Past, showcase events and transmissions, detailed schedules, organizers, eligibility, sponsored labels, and registration deadlines. Registration uses a local confirmation; full, expired, or ineligible listings cannot be registered. Registrations, reminder preferences, and reports persist per account. They never reserve real places, send messages, or submit reports externally.
- **Other destinations:** Leaderboard, Guilds, Social, Profile, and Notifications have the agreed placeholder pages. Profile also shows the current account information. Their full features remain outside this update.

Event examples use fixed October/November 2026 dates and automatically move into Past as time passes. The demo browser tests use a fixed date to verify open and closed registration cases. No external fonts, event links, payment flows, backend, or API service is needed. Mobile menus and details dialogs support keyboard focus, Escape, and responsive layouts.

## Preserved controls

- Required name/email and primary Founder/Mentor role, 9–20 character passwords with uppercase, lowercase, number and special character, matching confirmation, and separate eye controls.
- Default Remember Me lasts 10 days; unchecked sessions use the current tab. Immediate logout returns to Login.
- Local demo reset links, never OTPs or real emails. Reset links are one-use and superseded by new requests; production reset expiry remains undefined.
- Seven original assessment questions, disabled Next until valid, exclusive None yet evidence, Back, per-project autosave/resume, and locked completion.
- Responsive dashboard and roadmap entry points. Mock roadmap uses Discover/Validate/Build/Launch/Grow, five levels per stage and three milestones per level. Stage navigation and read-only milestone previews work; placement awards no completed milestones or coins.

Mentor registration retains a separate pending assessment because its question set is not supplied. Mentor login opens the dashboard; Founder roadmap access remains role-restricted. Full community, admin, and mission-submission work is outside this update.

## Source

```text
src/
  app/                         # Routing and providers
  components/common/           # Shared effects, Mentor handoff, and placeholders
  components/layout/           # Shared navbar/sidebar, mobile menu, and coin popup
  features/authentication/     # Auth UI, validation and browser-local accounts
  features/assessment/         # Project wizard, result card, and draft validation
  features/achievements/       # Badge collection and illustrative points ledger
  features/dashboard/          # Account overview and project counts
  features/events/             # Discovery and browser-local registration tracking
  features/projects/           # Per-account project grid, CRUD, migration, and assessments
  features/roadmap/            # Local mock roadmap and read-only previews
  hooks/                       # Shared auth hook
  services/storage/            # Browser storage with memory fallback
  styles/                      # Original shared theme
  utils/                       # Registration/login destinations
```

`Sample FE/` remains the unchanged reference, excluded from new-app lint. Browser storage contains mock profiles and salted password digests; it is not production identity or authorization. Clearing local storage resets this demo.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:ui
```

`test:ui` builds and runs the authentication/assessment, navigation/achievements/events, and multiple-project browser suites. They verify independent project assessments, resume, rename/delete, pagination, role restrictions, project access, points/badges, event registration/reminders/reports, account isolation, keyboard dialogs, mobile navigation, and responsive widths. The suites assert no backend or external requests. Screenshots are written under ignored `test-results/`.

Browser tests use installed Chrome/Edge on Windows or Playwright Chromium elsewhere. Set `LABX_BROWSER_PATH` for another local Chromium executable. If needed, install Playwright Chromium with `npx playwright install chromium`.
