# LabX frontend

JavaScript + React/Vite frontend with registration, login, assessment, dashboard, roadmap, shared navigation, achievements, and events. The original Sample FE visual style, welcome video, hologram, particles, sounds, cards, and responsive layouts are retained.

The latest agreed workflow takes precedence over the earlier PDF's skip-to-Q1 routing. The completion card follows the supplied screenshot. All accounts, progress, and roadmap data are browser-local mocks; no API, backend, or email service is required.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. Fonts and media are served locally. Demo login: `founder@labx.demo` / `Demo1234!`, available from **Use demo credentials** on Login.

## Founder workflow

1. On a signed-out visit, the logo animation opens Registration. The form tabs are **Register** and **Login**. The animation can be skipped; reduced-motion preferences bypass it.
2. Registration creates a local account and opens the initial seven-question assessment.
3. **Skip Initial Assessment** opens the dashboard. Previously entered answers remain saved.
4. Login always opens the dashboard, whether assessment is complete, unfinished, or skipped.
5. **Open Roadmap** permits completed users directly. Incomplete users remain on the dashboard with a **Complete Initial Assessment** popup. **Start Assessment** starts/resumes saved answers; **Maybe later**, Close, or Escape dismisses it. Direct `/roadmap` visits obey the same rule.
6. Completing the assessment always shows **Your LABX Starting Point**, including domain, stage, starting level, guild, and **Enter My Roadmap**. This applies both during registration and after a later dashboard reminder.
7. **Enter My Roadmap** opens the local mock roadmap. Completed answers stay locked. Later logins continue to open the dashboard with direct roadmap access.

Stage **Launch** and **Level 5** are approved illustrative values matching the screenshot, not a scoring algorithm. Domain and guild reflect the user's actual selection. Earlier pending mock results migrate to this sample placement while retaining completed answers.

## Navbar, achievements, and events

These screens follow the original `Sample FE/frontend` components and the navigation/achievements/events sections of `LabX_Attributes_updated.pdf`.

- **Shared navigation:** the original sidebar, brand, account footer, coin animation, and mobile navigation. The selected destination is highlighted. Branding has no navigation action. Avatar/name opens Profile; Sign out immediately opens Login. The X coin control reveals the balance on hover, keyboard focus, or tap. The bell opens Notifications.
- **Roles:** Founder navigation includes Dashboard, Roadmap, Leaderboard, Guilds, Social, Events, Achievements, and Profile. Mentors see Dashboard, Events, Achievements, and Profile; founder-only direct routes are restricted. The earlier assessment gate still applies to every Roadmap entry.
- **Achievements:** summary, All/Earned/Locked filters, badge details/criteria/dates, progress, recent transactions, and read-only Points History. The built-in demo account has 450 approved points and three earned badges; another 100 pending points are excluded. Other accounts start with zero points and no earned badges. This illustrative ledger never changes assessment or roadmap progress. Navbar Coins and the Achievements Points balance use the same non-cash value; there is no withdrawal or redemption.
- **Events:** search, category/format filters, date sorting, Upcoming/My Events/Past, showcase events and transmissions, detailed schedules, organizers, eligibility, sponsored labels, and registration deadlines. Registration uses a local confirmation; full, expired, or ineligible listings cannot be registered. Registrations, reminder preferences, and reports persist per account. They never reserve real places, send messages, or submit reports externally.
- **Other destinations:** Leaderboard, Guilds, Social, Profile, and Notifications have the agreed placeholder pages. Profile also shows the current account information. Their full features remain outside this update.

Event examples use fixed October/November 2026 dates and automatically move into Past as time passes. The demo browser tests use a fixed date to verify open and closed registration cases. No external fonts, event links, payment flows, backend, or API service is needed. Mobile menus and details dialogs support keyboard focus, Escape, and responsive layouts.

## Preserved controls

- Required name/email and primary Founder/Mentor role, 9–20 character passwords with uppercase, lowercase, number and special character, matching confirmation, and separate eye controls.
- Default Remember Me lasts 10 days; unchecked sessions use the current tab. Immediate logout returns to Login.
- Local demo reset links, never OTPs or real emails. Reset links are one-use and superseded by new requests; production reset expiry remains undefined.
- Seven original assessment questions, disabled Next until valid, exclusive None yet evidence, Back, per-account autosave/resume, and locked completion.
- Responsive dashboard and roadmap entry points. Mock roadmap uses Discover/Validate/Build/Launch/Grow, five levels per stage and three milestones per level. Stage navigation and read-only milestone previews work; placement awards no completed milestones or coins.

Mentor registration retains a separate pending assessment because its question set is not supplied. Mentor login opens the dashboard; Founder roadmap access remains role-restricted. Full community, admin, and mission-submission work is outside this update.

## Source

```text
src/
  app/                         # Routing and providers
  components/common/           # Shared effects, Mentor handoff, and placeholders
  components/layout/           # Shared navbar/sidebar, mobile menu, and coin popup
  features/authentication/     # Auth UI, validation and browser-local accounts
  features/assessment/         # Wizard, result card, roadmap gate and drafts
  features/achievements/       # Badge collection and illustrative points ledger
  features/dashboard/          # Incomplete/completed account dashboard
  features/events/             # Discovery and browser-local registration tracking
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

`test:ui` builds and runs the authentication/assessment regression and navigation/achievements/events browser suites. They verify both assessment completion paths, role restrictions, roadmap gating, points/badges, event registration/reminders/reports, per-account isolation, keyboard dialogs, mobile navigation, and responsive widths. Both assert no backend or external requests. Screenshots are written to ignored `test-results/auth/` and `test-results/community/`.

Browser tests use installed Chrome/Edge on Windows or Playwright Chromium elsewhere. Set `LABX_BROWSER_PATH` for another local Chromium executable. If needed, install Playwright Chromium with `npx playwright install chromium`.
