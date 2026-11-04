# Existing Data Model

## Persistence Boundary

The frontend stores demo application state in browser `localStorage` and transient verification/recovery state in `sessionStorage`. There is no relational database, ORM, backend schema, or database transaction manager in this repository. Persisted records are versioned JavaScript objects and are normalized when read.

`src/services/storage/local_storage.js` wraps browser storage with JSON helpers and an in-memory fallback for ordinary demo writes. Certain completion workflows use strict writes and report failure rather than claiming that a change was saved. Cross-tab changes are signaled through browser `storage` events and feature-specific custom events.

## Persisted Records

### Accounts and authentication session

- Keys: `labx.demo.profiles.v1`, `labx.demo.registrations.v1`, `labx.demo.session.v1` (see `AUTH_STORAGE_KEYS` in `src/features/authentication/services/mock_auth.js`).
- Account fields include `user` identity (`id`, `email`, `full_name`, `username`, `role`, avatar and assessment state), `password_salt`, `password_verifier`, and `auth_version`.
- Registration reservations include email, full name, role, remember-me choice, password verifier metadata, and a challenge with ID, verifier, expiry, and attempt count.
- Session state contains account data and an expiry time. Remembered and session-only storage are selected by the authentication flow.
- Roles accepted by the mock are `founder`, `mentor`, and `investor`. Passwords and verification codes are processed by frontend demo logic; no email or authentication server is connected.

### Projects and assessments

- Project key: `labx:projects:v1:<encoded-user-id>` (`src/features/projects/services/project_store.js`).
- Project records contain `id`, `name`, `owner_id`, `created_by`, `created_at`, `updated_at`, `assessment_completed`, `assessment_result`, `assessment_answers`, and `draft`.
- The containing object carries a version and legacy-migration markers.
- Assessment drafts use `labx:assessment-draft:v1:<encoded-user-id>` and contain assessment version, current step, answers, and optionally a question-update marker.
- Assessment results contain selected domain/guild and placement data; completed project records retain the normalized answer set and result.
- Project ownership is user-scoped. The store rejects updates when the account changes, and only founders can manage projects.

### Roadmap workflow and collaboration

- Roadmap workflow records use `labx:roadmap-workflow:v1:<owner-id>:<project-id>`. They hold project mission/workflow state, including milestone submissions, review status, evidence metadata, progress, and workflow timestamps. Evidence file bytes are not uploaded.
- Collaboration data uses the shared `labx:roadmap-collaboration:v1` key and contains team/invitation/access workflow records. `src/features/roadmap/services/roadmap_collaboration.js` defines the storage and change-event boundary.
- A roadmap snapshot is derived from a project and workflow record; approval of founder-submitted work can notify the achievement store.

### Profile and Founder Passport

- Profile key: `labx:profile:v1:<encoded-user-id>`. The record includes version, user ID, profile details, and update timestamp.
- Profile detail fields include biography, city/country, goals, professional background, education, skills, interests, availability, website/portfolio/LinkedIn URLs, public email, fundraising status, startup details, avatar/banner metadata, and field-level privacy settings.
- Founder Passport key: `labx:passport:v1:<encoded-user-id>`. The application includes status, form, status history, review feedback, interview information, passport number/issue date, cycle, and update timestamp.
- Passport form fields include legal name, contact email, location, project ID, venture name, founder role/story, portfolio URL, evidence metadata, and consent. The selected project must belong to the applicant.
- Profile and passport records have explicit validation and normalization; profile file data is bounded by the profile-file helpers.

### Events and opportunities

- Event catalogue is mock data in `src/features/events/services/mock_events.js`.
- User-specific event state is keyed by `labx.demo.events.v1:<encoded-user-id>`.
- Saved state contains registration records, reports, outcomes, and saved-event records. Registration records distinguish internal registration from `external_pending` and confirmed external registration.
- Event outcomes include participation details and certificate metadata. Uploaded certificate bytes are not persisted.

### Achievements and daily quests

- Achievement activity key: `labx:achievement-activity:v1:<encoded-user-id>`. Records describe approved roadmap mission or level recognition, with user, owner, project, metric, status, date, and mission/level reference. These records award zero points.
- Daily side-quest ledger key: `labx.side-quests.v1.<encoded-user-id>`. Each entry contains day, quest ID, response text, and completion time. The ledger records separate demo coin totals.
- The leaderboard and points snapshots include mock/catalog data; no financial or external reward ledger is connected.

### Companion conversations

- Companion key: `labx:sharp:v1:<encoded-user-id>`.
- State contains settings, memories, document metadata/excerpts, conversation sessions, active conversation/project context, and preview usage counters.
- A conversation contains ID, title, messages, project ID/owner ID, and created/updated timestamps. Messages contain role, content, timestamp, and an optional validated in-app action link.
- Companion behavior is a local deterministic preview. No AI service or remote model endpoint is configured.

## Relationships and Constraints

- A user owns multiple projects; project IDs scope assessments and roadmaps.
- A project has one assessment draft and can retain one completed assessment result and answer set.
- Roadmap workflow and collaboration data reference project and owner IDs.
- Approved roadmap mission activity references a project and mission; level recognition requires its three approved mission contributions.
- Profile, passport, event, achievement, daily quest, and companion records are scoped to a user ID.
- Passport applications may reference one of the user's existing projects.
- Events are catalogue records; a user's registration, report, outcome, and saved-event entries reference event IDs.
- No SQL foreign keys, ORM cardinalities, or cross-service data contracts exist in the source.

## Key Entities

| Entity | Description |
|---|---|
| User/account | Demo identity, role, credentials verifier, assessment status, and authentication/session metadata. |
| Project | User-owned venture/project with name, timestamps, assessment state, and draft. |
| Assessment draft/result | Versioned answers and current step, followed by normalized assessment outcome and saved answers. |
| Roadmap submission | Per-project mission work/evidence metadata, review status, and progress state. |
| Collaboration record | Founder/member access, invitations, assignments, and join/activity workflow data for roadmaps. |
| Profile | User identity and public/private founder, mentor, or investor details, including startup and media metadata. |
| Passport application | Founder application form, evidence, status history, interview, decision, and issued passport metadata. |
| Event registration/outcome | User-specific registration, reminder, report, participation outcome, and certificate metadata for a mock listing. |
| Achievement activity | Recognition derived from approved roadmap work; separate from points and placement credits. |
| Companion state | Local chat sessions, messages, settings, memories, linked documents, and project context. |

## Transaction Boundaries

There are no database transactions. A store typically normalizes an object, mutates it, and writes the serialized value to browser storage. Strict storage writes are used where the UI must not report success until persistence succeeds (for example mission review/approval and daily quest completion). Each such write is a single browser-storage operation; multi-key atomicity is not provided.
