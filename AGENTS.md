# Furry Drama Tracker — AGENTS.md

## Project Overview

Full-stack web app for aggregating and tracking furry drama series (兽剧). Two packages, no monorepo tooling — each has its own `package.json` and is run independently.

## Structure

```
backend/     Express + MongoDB API (CommonJS, port 5000)
frontend/    React + Vite SPA (ESM, port 3000, proxies to backend)
```

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
JWT_SECRET=<any-secret>
MONGO_URI=mongodb://localhost:27017/furry-drama
```

The app exits immediately if either is missing.

## Per-Package Details

- [backend/AGENTS.md](backend/AGENTS.md) — commands, middleware pipeline, auth, rate limits, conventions, gotchas
- [frontend/AGENTS.md](frontend/AGENTS.md) — commands, architecture, i18n, CSRF handling, conventions, gotchas

## No Tests

Neither package has a test suite. `npm test` in backend exits with an error; frontend has no test script.

## No CI/CD

No GitHub Actions, no pre-commit hooks, no automated pipelines.
