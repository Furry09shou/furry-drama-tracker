# Frontend — AGENTS.md

## Commands

```bash
npm install          # install dependencies
npm run dev          # dev server on http://localhost:3000
npm run build        # production build → dist/
npm run preview      # preview production build locally
npm run lint         # eslint (js,jsx; --max-warnings 0)
```

No test runner is configured.

## Dev Server Proxy

Vite proxies `/api` and `/uploads` to `http://localhost:5000` (the backend). If the backend is not running, every API call will fail silently or hang. Always start the backend first when doing full-stack work.

## Architecture

- **Entry**: `src/main.jsx` → `App.jsx`
- **Routing**: react-router-dom v6, defined in `App.jsx`. Admin routes (`/admin/*`) render under `AdminLayout`; public routes render with `NavBar`.
- **State**: No external state library. All global state lives in React Contexts:
  - `AuthContext` — user auth, token in `localStorage`
  - `ThemeContext` — dark/light/system theme
  - `I18nContext` — zh/en i18n (locale files in `src/locales/`)
  - `SiteSettingsContext` — runtime site config from API
- **HTTP**: axios, globally configured in `src/utils/axiosConfig.js`. Handles CSRF token (`X-XSRF-TOKEN` header), 401 auto-redirect, and `withCredentials: true`.
- **Styling**: Pure CSS variables defined in `src/index.css`. No CSS-in-JS or preprocessor. Theme switching changes CSS custom properties.
- **PWA**: `public/sw.js` + `public/manifest.json`. Service worker registered in `main.jsx`.

## Key Conventions

- **No TypeScript** — plain JSX throughout.
- **No ESLint config file** — relies on eslint plugin defaults via `package.json` script. The lint command uses `--ext js,jsx --max-warnings 0`.
- **Production builds strip console/debugger** — configured in `vite.config.js` via `esbuild.drop`.
- **Env vars** must be prefixed `VITE_` to be exposed to client code. Only `VITE_API_BASE_URL` is used (for cross-origin deployment).
- **Admin vs User auth** — separate token storage: `localStorage.token` / `localStorage.user` for users; `localStorage.adminToken` / `localStorage.adminData` for admins. The 401 interceptor redirects accordingly.
- **i18n** — `t('key.path')` function from `useI18n()` hook. Fallback language is `zh`. New strings must be added to both `src/locales/zh.js` and `src/locales/en.js`.
- **Components** are flat files in `src/components/`. No folder-per-component pattern. Admin components are prefixed `Admin*`.

## Gotchas

- The CSRF token is fetched on app init via `fetchCsrfToken()` and attached to all non-GET requests. If you add a new API call outside axios (e.g. `fetch`), you must handle CSRF yourself.
- `axiosConfig.js` is imported as a side effect in `main.jsx` (`import './utils/axiosConfig'`). Do not remove this import.
- `AuthContext` sends a session heartbeat every 5 minutes when a user is logged in.
- The `ErrorBoundary` class component at the bottom of `App.jsx` uses `I18nContext` via `static contextType` — a legacy pattern, do not convert to hooks.
