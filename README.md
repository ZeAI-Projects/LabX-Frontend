# LabX frontend

JavaScript + React/Vite frontend with registration, login, project assessments, dashboard, multiple project roadmaps, shared navigation, achievements, and events. The original Sample FE visual style, welcome video, hologram, particles, sounds, cards, and responsive layouts are retained.

The latest agreed workflow takes precedence over the earlier PDF's skip-to-Q1 routing. The completion card follows the supplied screenshot. All accounts, progress, and roadmap data are browser-local mocks; no API, backend, or email service is required.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. Fonts and media are served locally. Create an account with **Sign up**, then use your registered email and password to **Sign in**.

## Projects and founder workflow

1. Signed-out visits open **Sign in** directly, with **Sign up** available in the shared authentication tabs. Signed-in visits continue to their dashboard. The original introduction remains available at `/intro`; Skip and reduced-motion preferences return through the same entry route.
2. Sign up and Sign in use the same compact animated layout. Authentication wording follows the supplied AUTH requirements: **Create Your LabX Account** / **Start building your future today.**, **Sign in** / **Welcome back. Continue your LabX journey.**, **Enter OTP**, and verification-code recovery labels. Founder registration is displayed as **Founder/Builder**, followed by Investor and Mentor; its saved role remains `founder`. Sign up first opens `/verify-email`: a six-digit demo code must be accepted before an account or session is created. Invalid codes can be retried; resend replaces the previous code, codes expire after ten minutes, and five incorrect attempts require a fresh code. Pending verification survives refresh in the same tab. Codes are displayed clearly as demo data; no email is sent.
3. Verified Founder signup opens **New project**. Enter a project name (required, up to 100 characters), then **Start assessment** opens the eight-question Founder Assessment for that project.
4. Every project has independent answers, saved progress, assessment results, and a roadmap. Answers save automatically; **All projects** returns to the list, and a draft can be resumed from its row anytime.
5. Sign in opens the dashboard, which shows project, ready-roadmap, and unfinished-assessment counts.
6. **Roadmap** in navigation and **View projects** on the dashboard open `/roadmap`, with **My roadmaps**, **Joined roadmaps**, and **Invitations**. The owned-project table keeps one compact row per project and ten projects per page, showing creator, date, assessment progress, current mission placement, and completion counts. Each row includes assessment/roadmap, edit, and delete actions. On smaller screens, scroll the table horizontally to see all columns. **New project** begins the name-first flow.
7. **Edit** changes the project name only. **Delete** asks for confirmation before removing that project, its answers, and its roadmap. Cancel and Escape leave it intact. Page numbers adjust after deletion.
8. Completing an assessment shows a compact **Your assessment summary** card with the eight questions and their saved selections. **Enter My Roadmap** continues to the roadmap, and **All projects** returns to the list. Each answer offers **Edit**, a predefined choice selector, **Save**, and **Cancel**. Saving updates that choice and its linked domain/guild while preserving roadmap evidence and progress. Earlier assessments show only their saved problem area so old answer numbers are never attributed to new questions.

Project routes are `/roadmap/:projectId/assessment`, `/roadmap/:projectId/result`, and `/roadmap/:projectId`. A draft cannot open its roadmap until its own assessment is complete. Missing, deleted, and other-account projects show a not-found message; mentors remain restricted to their existing flow. The old `/assessment` link opens New project; `/assessment/result` opens the first completed result or the list.

Existing completed account assessments migrate once into **My first project**. Existing unfinished assessment answers transfer to the first named project. Deleting a migrated project does not recreate it on refresh. Project data persists per account in this browser and does not synchronize to a server.

Domain and guild reflect the assessment selection. Historical assessment records retain their illustrative stage/level data, but the roadmap workflow starts at **Discover, Level 1, Mission 1** until initial evidence is accepted. Existing project names and answers are preserved. The dashboard and roadmap show workflow progress; the assessment result shows the actual saved responses.

## Roadmap missions and collaboration

The board follows Sample FE's five stage/rank colors and crests, using five levels per stage and three missions per level. Each stage is a winding road that starts at the bottom and progresses upward. The entire roadmap flows with the page, without an inner vertical scroll area. The page opens near the current mission; **Find current mission** scrolls the page back to it without opening a dialog. Only the continuous completed/credited section through the current mission lights up. Locked stages remain dim, and a fully covered stage lights the entire road. Every roadmap starts with a complete structure and locked prerequisites. Accepted work unlocks the next mission, then the next level, then the next stage. Covering all 75 missions completes the roadmap.

The detailed map follows the supplied highway reference with a continuous dark grid, prominent domain heading, compact coverage pill, five crest-based stage cards, and a floating badge in the selected stage's rank color. Angular mission panels alternate across a wide cyan road, connected to large checkpoint circles. Accepted missions show green **Conquered** and **Review** states; placement credits stay distinct. Stage cards show actual completion/current/locked status independently from the selected preview. Stage navigation and team controls remain available above the map; the stage row scrolls on narrow screens. The desktop shell is quieter on this view; mobile navigation and dialog access are retained.

- Open the current mission, describe the work in 80–10,000 characters, and provide an HTTP(S) evidence link or a nonempty file up to 5 MiB. Invalid input produces saved feedback and can be edited and resubmitted. Accepted missions cannot be submitted twice.
- Evaluation is explicitly simulated: deterministic checks validate text length, URL/file metadata, and prerequisite coverage. No AI or person evaluates content, no links are fetched, and file bytes are neither uploaded nor persisted. Only bounded notes, URLs, filenames, sizes, types, attempts, and outcomes are stored locally.
- The initial mission optionally requests a later stage/level. Every earlier level needs its own work description and evidence URL. Earlier missions receive separate placement credits; they are not fabricated completions. Both credits and completed missions contribute to coverage. Accepted demo submissions update the submitting founder's badge progress, without awarding points. Placement credits never award recognition.
- **Manage team** lets an owner invite another registered Founder in this browser as a co-founder/member. The recipient accepts or declines under **Invitations**. No email is sent. Accepted members find the project under **Joined roadmaps**.
- Owners assign canonical missions to accepted members. A member can submit only an assigned, currently unlocked mission; the initial placement mission remains owner-only. Members cannot edit project names, delete projects, invite others, read assessment answers, or read evidence for unassigned missions. Assignment changes take effect on every read and submission.
- `/roadmap/joined/:ownerId/:projectId` requires accepted membership. Pending/declined invitations, deleted projects, other accounts, and non-Founder roles do not grant access. Workflow and collaboration records use separate versioned browser storage; source project existence is checked on each operation.

The dashboard and project rows refresh from saved workflow progress. Browser-local checks are a UI prototype, not production authorization; a real backend, file storage, email delivery, and AI evaluator remain future integration work.

## Navbar, achievements, and events

These screens follow the original `Sample FE/frontend` components and the navigation/achievements/events sections of `LabX_Attributes_updated.pdf`.

- **Shared navigation:** the original sidebar, brand, account footer, coin animation, and mobile navigation. The selected destination is highlighted. Branding has no navigation action. Avatar/name opens Profile; Sign out immediately opens Sign in. The X coin control reveals the balance on hover, keyboard focus, or tap. The bell opens Notifications.
- **Roles:** Founder navigation includes Dashboard, Roadmap, Leaderboard, Guilds, Social, Events, Achievements, and Profile. Mentors and Investors see Dashboard, Events, Achievements, and Profile; founder-only direct routes are restricted. Each project requires its own assessment to open its roadmap; the project list is always available to founders.
- **Dashboard:** the role-specific command center follows the supplied workflow and the PDF's dashboard attributes. Founders can select an owned project, resume its assessment, open its current mission, preview roadmap stages, and see compact project rows. Account points, badges, rank, and recent activity reuse Achievements and Leaderboard data. Saved mission progress and placement credits are independent of the illustrative reward ledger. Clickable badges and upcoming/saved events open their corresponding details. Founder Passport has an optional overview linking to the local application and review workflow in Profile; guild activity remains unavailable.
- **Mentor and investor dashboards:** saved profile preferences and setup/edit actions, a role-specific journey, relevant upcoming/saved events, and accurate empty states. Mentor Active/Trial/Past views have no fabricated assignments. Completing investor preferences does not claim application submission or verified status. Real admin verification and mentorship operations require later integration; Founder Passport review can be simulated locally.
- **Dashboard detail links:** roadmap supports `?stage=Discover` (or another canonical stage) and accessible `?milestone=ID`; Achievements supports `?badge=ID`; Events supports `?event=ID` and `?view=my`. Invalid parameters fall back safely, and browser navigation updates the selected details.
- **Achievements:** compact collection with All/Earned/Locked filters and counts, earned/total progress, colorful medals, criteria, earned dates, badge details, next achievement, and read-only Points History. The built-in demo starts with 450 approved points and three badges; 100 pending points are excluded. Other founders start at zero. Accepted roadmap missions now create persistent, deduplicated demo recognition for the submitting founder: one approved mission counts as a quest; all three missions in a level approved for that same founder count as a milestone. Rejected work, placement credits, and another collaborator's work do not count. Earned recognition survives project deletion and reloads. These additions never change the points ledger or award money. Mentor/investor views do not expose founder progress.
- **Leaderboard:** `/leaderboard` follows the supplied global/domain workflow, the Sample FE podium and standing layout, and the PDF's rank, username, points, ranking-period and eligibility attributes. Global ranks all founders; By domain requires an explicit choice from the supported problem areas, including domains from previously completed assessments. Each scope has a top-three podium, highest-point founder details, submitted name/handle search, and a paginated table. Searches retain the scope's ranks. Founder detail dialogs include domain, stage/level, earned badge count, points, period and eligibility; Escape restores focus to the opener.
- **Ranking rules for this preview:** all-time approved LabX Points descending; equal scores share competition ranks (1, 1, 3), with names/IDs ordering tied rows. There are 24 fictional sample founders plus the current founder once. The current founder's points and badges come from Achievements (initially 450/3 for the built-in demo and 0/0 for new accounts; badge totals increase with accepted work). Completed owned-project assessments determine domain membership; multiple projects never multiply points. Unassessed founders appear globally with no invented domain or placement. The current-standing panel offers **Find my rank**. No backend, live feed, prizes, seasons, or new point awards are added.
- **Events:** All Broadcasts / Showcase Events / Transmissions with a broad opportunity catalogue, search, category/format/date/location/eligibility/fee/prize/sponsorship filters, and date sorting. Upcoming, Ongoing, My Events, Completed, and Past views track the journey. Details show schedules, organizers, capacity, eligibility, fees/prizes, sponsor disclosures, and deadlines. Full, expired, and ineligible listings cannot be registered, including from a stale dialog.
- **Registration and outcomes:** internal registration saves a local confirmation. External registration is pending until the user explicitly records their own confirmation reference; opening an external preview never claims organizer approval. Reserved `example.org` links illustrate registration/payment destinations and are never opened automatically; no payment is collected. Confirmed attendees can record participation after the event starts, add results/awards, notes, feedback/rating, and attach/download a PDF, PNG, JPG, or WebP certificate up to 1 MiB. Validated certificate bytes are kept locally, unlike roadmap evidence metadata. Saved outcomes appear as Completed and can be edited or have their certificate removed. Registrations, reminders, reports, and outcomes remain account-scoped browser data; no real place, notification, award, or verification is created.
- **Other destinations:** Guilds, Social, and Notifications have the agreed placeholder pages. Profile and Founder Passport are described below.

Event examples use fixed October/November 2026 dates and automatically move into Ongoing and Past as time passes. The demo browser tests use a fixed date to verify registration, tracking, and participation. No external fonts, backend, or API service is needed; external preview links require an explicit click. Mobile menus and details dialogs support keyboard focus, Escape, and responsive layouts.

## Preserved controls

- Required name/email and Investor, Mentor, or Founder role, 9–20 character passwords with uppercase, lowercase, number and special character, matching confirmation, and separate eye controls.
- Remember Me retains the existing ten-day session behavior; unchecked sessions use the current tab. The ten-day helper text has been removed from both forms. Immediate sign out returns to Sign in.
- Forgot Password displays **Send six-digit code**, distinguishes required email from invalid format, and accepts registered accounts only. The recovery code screen is titled **Enter OTP** and uses **Six-digit code**, **Enter New Password**, **Re-enter New Password**, and **Reset New Password**. Codes expire after ten minutes, permit five incorrect attempts, are replaced when resent, and can be used once. A successful reset returns to Sign in with the email prefilled, and invalidates existing sessions for that account. This remains a local demo: the code is clearly displayed on-screen and no email is sent. Real email delivery requires a backend integration.
- Eight Founder Assessment questions cover problem area, target users, solution type, current startup stage, problem validation, product progress, customer/business progress, and the current blocker. All answers use the supplied predefined options with exactly one selection per question, including Other / Not listed and Not sure yet where specified. There are no free-text assessment fields. Next stays disabled until selected; completion requires all eight answers. Back, per-project autosave/resume, and summary editing remain supported.
- Assessment drafts use question-set version 2. Unfinished drafts from the previous demo questions restart with an update notice instead of reinterpreting their numeric answers. Previously completed assessments and roadmaps remain intact. No answer-based scoring formula was supplied: the existing roadmap evidence and placement workflow remains responsible for progression.
- Responsive dashboard and roadmap entry points. Discover/Validate/Build/Launch/Grow each contain five levels and three missions per level, with local evidence submission, feedback, sequential unlocks, placement credits, and founder collaboration.

Verified Investor signup opens `/onboarding/investor` for investment focus, preferred stage, and optional organization. Verified Mentor signup opens `/onboarding/mentor` for expertise, experience, and availability. Both forms save drafts per account, survive refresh, and persist completed profiles locally before opening the dashboard. The dashboard offers profile setup or editing as appropriate. The legacy mentor assessment URL redirects to Mentor onboarding. All existing-user sign-ins open the dashboard; Founder roadmap access remains role-restricted. Full community and admin work remain outside this update.

## Source

```text
src/
  app/                         # Routing and providers
  components/common/           # Shared effects, Mentor handoff, and placeholders
  components/layout/           # Shared navbar/sidebar, mobile menu, and coin popup
  features/authentication/     # Auth UI, validation and browser-local accounts
  features/assessment/         # Project wizard, result card, and draft validation
  features/achievements/       # Badge collection and illustrative points ledger
  features/dashboard/          # Role dashboards, owned-project progress and shared summaries
  features/events/             # Discovery and browser-local registration tracking
  features/leaderboard/        # Global/domain rankings, search and founder spotlights
  features/profile/            # Dossier, visibility, local Passport application/review
  features/projects/           # Per-account project list, CRUD, migration, and assessments
  features/roadmap/            # Mission board, local evaluation/progression and collaboration
  hooks/                       # Shared auth hook
  services/storage/            # Browser storage with memory fallback
  styles/                      # Original shared theme
  utils/                       # Registration/login destinations
```

The legacy `Sample FE/` reference is available in Git history. Browser storage contains mock profiles and salted password digests; it is not production identity or authorization. Clearing local storage resets this demo.

## Profile and Founder Passport

The Profile screen follows Sample FE's dossier styling, PDF pages 12?13 and 16?17, and the supplied application workflow. Profile editing includes identity, photo/banner uploads, bio, location, skills/interests, collaboration, professional details, links, and founder venture details. Usernames are unique across saved accounts. Identity updates preserve role, credentials, assessment results, and points. Read-only project progress and earned achievements come from existing stores.

Visibility settings control each optional field and dossier section in the public preview. Login email and Passport applications/evidence are never included. This is a local preview, not a published public profile or server-side access control.

Founders may save or submit an optional Passport application with evidence. Clearly labelled demo reviewer controls cover completeness review, additional information and resubmission, eligibility, an optional interview, approval/rejection with feedback, and renewal. Approval creates only a demo Passport reference and status; it does not grant real verification, physical cards, access, money, or achievement points. The references leave eligibility criteria and renewal timing undefined, so there is no automatic qualification or expiry rule. Investor and mentor profiles retain their role preferences without Founder Passport controls.

Image uploads accept PNG/JPEG/WebP (avatar up to 512 KiB; banner up to 1 MiB). Passport evidence accepts those image formats and PDF, up to three files, 1 MiB per file and 2 MiB total. Validated file bytes, drafts and review history are account-scoped browser data, with memory fallback when storage is unavailable. Use sample evidence for this frontend demo; no reviewer receives files and no email is sent.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:ui
```

`test:ui` builds and runs authentication/assessment, navigation/achievements/events, event workflow, multiple-project, leaderboard, dashboard, roadmap, and profile browser suites. They cover role flows, recovery, independent projects, CRUD, filtering, restricted routes, registration methods, participation/certificates, mission rejection/resubmission, saved progression, invitations, member assignments, keyboard dialogs, and responsive widths. Unit tests cover the full 75-mission progression, badge recognition/deduplication/attribution, advanced placement, malformed storage, stale-account checks, external registration guards, certificate validation, and member evidence redaction. Browser suites assert no automatic backend or external requests. Screenshots are written under ignored `test-results/`.

Browser tests use installed Chrome/Edge on Windows or Playwright Chromium elsewhere. Set `LABX_BROWSER_PATH` for another local Chromium executable. If needed, install Playwright Chromium with `npx playwright install chromium`.
