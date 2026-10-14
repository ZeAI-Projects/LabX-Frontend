# Mobile UI regression checks

Run from `frontend/`:

```sh
npm ci
npx playwright install chromium
npm run test:mobile
```

Alternatively, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chrome/Chromium
executable. The suite starts and stops its own local Vite server on port 5188.
It disables local environment-file loading and intercepts every API request with
fictional fixtures. External requests are blocked; API writes fail the test.

Checks cover populated roadmap, leaderboard, and achievement screens at 320, 375,
390, 430, 768, 844 (landscape), and 1440 pixels. It checks content overflow, badge
columns, milestone access, profile navigation, search/filter requests, the menu,
focus restoration, logout, achievement error/empty states, reduced motion, and
preservation of styled heading children during page reveals.

Browser screenshots and a browsable review are generated in
`test-results/mobile/index.html` (ignored by Git). Screenshots fast-forward
finite animations to capture the settled layout. The behavior checks run with
normal motion enabled, followed by a separate reduced-motion check.

These automated Chromium checks complement testing on a physical phone,
especially for Safari, the on-screen keyboard, and device safe areas.
