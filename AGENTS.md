# Furry Drama Tracker — AGENTS.md

## Project Overview

Full-stack web app for aggregating and tracking furry drama series (兽剧). Two packages, no monorepo tooling — each has its own `package.json` and is run independently.

## Structure

```
backend/     Express + MongoDB API (CommonJS, port 5000)
frontend/    React + Vite SPA (ESM, port 3000, proxies to backend)
scripts/     One-off utility scripts
docs/        Design & migration plans
```

Utility scripts live in `scripts/`. There is no root `package.json` — each package manages its own dependencies independently.

## Startup Order

1. Start backend first (`cd backend && npm run dev`)
2. Then frontend (`cd frontend && npm run dev`)

The frontend dev server proxies `/api` and `/uploads` to `http://localhost:5000`. If the backend isn't running, all API calls fail silently.

## Required Services

- **MongoDB** must be running and reachable via `MONGO_URI` env var
- **Node.js >= 18**

## Required Env Vars (Backend)

Create `backend/.env` with at minimum:

```
JWT_SECRET=<at-least-32-chars-random-string>
MONGO_URI=mongodb://localhost:27017/furry-drama
```

The app exits immediately if either is missing. `JWT_SECRET` is also validated to be >= 32 characters.

## Per-Package Details

- [backend/AGENTS.md](backend/AGENTS.md) — commands, middleware pipeline, auth, rate limits, conventions, gotchas
- [frontend/AGENTS.md](frontend/AGENTS.md) — commands, architecture, i18n, CSRF handling, conventions, gotchas

## Cross-Cutting Gotchas

### Captcha system
- In-memory store (`global._captchaStore` in `backend/routes/auth.js`). Lost on every nodemon restart.
- **Captcha verification only checks the first 4 characters** even though 6 are generated. The SVG canvas (120x40px) is too narrow to display all 6 — this is intentional, not a bug.
- Captcha is one-time-use: deleted from store regardless of pass/fail.
- Submit button is disabled until captcha loads (`captchaLoading` state in `Login.jsx` and `Register.jsx`).

### Express 5
Backend uses Express 5 (`^5.2.1`). Error handling differs from Express 4 — async route errors must use `asyncHandler` wrapper from `utils/errorHandler.js`.

### Vite PWA service worker
The `VitePWA` plugin registers a service worker even in dev (`devOptions: { enabled: true }`). Console messages like `workbox No route found for: /api/...` are harmless — unmatched routes fall through to the network. The SW does NOT cache `/api/auth/*` paths.

### CSRF (both packages)
- All non-GET API calls require CSRF: `GET /api/csrf-token` sets a cookie, frontend sends matching `X-XSRF-TOKEN` header via axios interceptor in `frontend/src/utils/axiosConfig.js`.
- `axiosConfig.js` is imported as a side effect in `main.jsx`. Removing it silently breaks all mutating API calls.
- If login returns 403 (not 400), CSRF is the likely culprit.

### Vite port fallback
`vite.config.js` targets port 3000, but Vite auto-picks 3001/3002 if 3000 is occupied. The `ALLOWED_ORIGINS` in the backend includes all three. The proxy always forwards to `localhost:5000` regardless.

## No Tests

Neither package has a test suite. `npm test` in backend exits with an error; frontend has no test script.

## No CI/CD

No GitHub Actions, no pre-commit hooks, no automated pipelines.
