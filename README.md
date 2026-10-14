# LabX Profile

Frontend-only React profile module. The profile content follows `N:/WORK/Files/LabX_Profile_React_Mock_Standalone/LabX_Profile_React_Mock`. The sidebar, logo, Navbar, mobile navigation and animated coin control come from `Sample FE/frontend`. Both reference folders remain unchanged.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The app displays your own `mockProfiles.self` profile at `/` and `/profile`. The Owner/Visitor preview switch and separate visitor mock have been removed.

## Behavior

- Profile editing with cancel/save, skill/interest/goal tags, portfolio links and local image preview.
- Name and avatar changes update the original Sample FE sidebar account display.
- Original Sample FE badge `icon`/trophy fallback; no alternate mock badge symbols. Profile action icons reuse icons already present in Sample FE.
- Followers/following lists, post carousel, likes and comments use local React state.
- Compact Founder Passport form, optional image, review and mock draft state follow the new profile reference. No application is sent, no verification is performed and no passport is issued. Form fields are reference prototype fields, not finalized PDF business rules.
- Only the profile module is implemented. The original navigation shell remains; links outside Profile display a profile-only scope message.
- No API/backend/auth connection, browser storage or external requests on initial load. All edits reset on reload. Passport drafts remain only while that dialog is open, as stated in its UI.
- Keyboard focus, Escape dismissal and responsive layouts are supported.

## Active source

- `src/app/App.jsx`: original Sample FE shell around the profile module.
- `src/modules/profile/pages/ProfilePage.jsx`: own-profile state and composition.
- `src/modules/profile/components/`: profile cards, editor, posts and Passport form.
- `src/modules/profile/data/mockProfile.js`: single self profile and sample community data.
- `src/modules/profile/pages/ProfilePage.css`: new reference profile styling.
- `src/modules/profile/integration.css`: small shell integration overrides.
- `src/components/common/`, `src/styles/globals.css`: Sample FE shell and shared styling.

The previous profile implementation under `src/pages/` and `src/features/profile/` is retained but is not rendered. Only its shared context and modal utility are reused. The alternate reference shell under `src/modules/profile/components/AppShell.jsx` is not rendered or imported by the active app.

## Verification

```sh
npm run build
npm run lint
npm run test:profile
```

For browser checks, start the dev server first. Tests default to `http://localhost:5173`; set `LABX_URL` for a different origin. Tests use Microsoft Edge through Playwright; `PLAYWRIGHT_CHANNEL=chrome` selects Chrome. Screenshots are written under `tests/screenshots/`.

Checks cover original shell/logo/header and badge icons, absence of the preview switch, editing/cancel/save, shared account identity, likes/comments, Passport review, desktop/mobile/tablet layouts, mobile menu, runtime errors and remote requests.
