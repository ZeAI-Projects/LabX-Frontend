# Tech Stack

## Language and Runtime

- Application source is JavaScript using JSX; no TypeScript source or `tsconfig.json` is present.
- Browser runtime: React single-page application.
- Build/development runtime: Node.js with npm. `package.json` does not declare a Node engine range.
- `package-lock.json` uses lockfile version 3.

## Frameworks and Tooling

| Package | Manifest requirement | Installed version |
|---|---:|---:|
| `react` | `^19.2.8` | `19.3.0` |
| `react-dom` | `^19.2.8` | `19.3.0` |
| `react-router-dom` | `6.30.6` | `6.30.6` |
| `vite` | `^8.3.0` | `8.3.4` |
| `@vitejs/plugin-react` | `^6.1.1` | `6.1.2` |
| `@fontsource/inter` | `^5.0.0` | `5.3.0` |
| `lucide-react` | `1.34.0` | `1.34.0` |

## Development and Test Dependencies

| Package | Manifest requirement | Installed version |
|---|---:|---:|
| `eslint` | `^10.10.0` | `10.12.0` |
| `@eslint/js` | `^10.0.1` | `10.0.1` |
| `eslint-plugin-react-hooks` | `^7.1.1` | `7.1.1` |
| `eslint-plugin-react-refresh` | `^0.5.6` | `0.5.7` |
| `globals` | `^17.12.0` | `17.13.0` |
| `@types/react` | `^19.2.18` | `19.3.0` |
| `@types/react-dom` | `^19.2.7` | `19.3.0` |
| `playwright` | `1.63.0` | `1.63.0` |

The React type packages are installed as development dependencies despite the application being JavaScript/JSX.

## Build, Test, and Runtime Configuration

- `npm run dev`: starts Vite.
- `npm run build`: runs `vite build`.
- `npm run preview`: serves the production bundle through Vite preview.
- `npm run lint`: runs `eslint .`.
- `npm test`: runs Node's built-in test runner for `tests/*.test.mjs` and the assessment service tests.
- `npm run test:ui`: builds, then runs Playwright-driven browser flows.
- `vite.config.js`: React plugin only; no custom aliases, proxy, or environment configuration was found.
- `index.html`: SPA host document and root mount.

No deprecated framework or end-of-life package was identified from the repository configuration alone. The manifest does not declare a minimum or maximum Node.js version; the actual runtime compatibility floor is therefore not stated in this project manifest.

## Integration and Persistence Libraries

- Browser `localStorage` and `sessionStorage` through `src/services/storage/local_storage.js`.
- Browser APIs used by features include `crypto.randomUUID`, `window` events, `URL`, and `navigator.clipboard`.
- No HTTP client, API schema, ORM, database driver, message client, or server framework was found in the inspected source.
