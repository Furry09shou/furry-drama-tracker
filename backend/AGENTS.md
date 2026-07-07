# Backend — AGENTS.md

## Commands

```bash
npm install          # install dependencies
npm run dev          # nodemon dev server on port 5000
npm start            # node production server
npm run seed         # seed database with sample data
npm run seed-admin   # seed a default admin account
```

No test runner is configured (`npm test` exits with error).

## Required Environment Variables

The app **refuses to start** without these (checked at boot in `src/index.js`):

- `JWT_SECRET` — signing key for JWT tokens
- `MONGO_URI` — MongoDB connection string

Other env vars used (non-fatal if missing):
- `PORT` — defaults to 5000
- `NODE_ENV` — `production` enables secure cookies, hides error stacks, strips helmet CSP
- `FRONTEND_URL` — added to CORS allowed origins
- `ALLOWED_ORIGINS` — comma-separated additional CORS origins
- `DEMO_EMAILS` — comma-separated emails exempt from certain restrictions (default: `demo@furry09.com`)
- `SMTP_*` / `EMAIL_*` — email sending config for nodemailer

`dotenv` loads `.env` from `config/db.js`. The `.env` file is gitignored.

## Architecture

- **Entry**: `src/index.js` — Express app setup, middleware chain, route mounting, cron jobs, graceful shutdown.
- **DB**: MongoDB via Mongoose. Connection established in `config/db.js`. All models in `models/`.
- **Routes**: Express Routers in `routes/`. Every route is mounted at both `/api/<name>` and `/api/v1/<name>` (dual-versioned automatically).
- **Middleware pipeline** (in order):
  1. `cookieParser`
  2. `helmet` (CSP disabled)
  3. `cors` (whitelist-based, credentials enabled)
  4. Request timeout (30s)
  5. Selective request logging (errors + list/history/follows paths)
  6. `express.json` / `urlencoded` (10mb limit)
  7. `sanitizeInput` — XSS sanitization via `xss` lib, strips `$`-prefixed keys (NoSQL injection prevention)
  8. CSRF token endpoint (`GET /api/csrf-token`)
  9. CSRF validation on non-GET requests (cookie vs `X-XSRF-TOKEN` header)
  10. `trackApiUsage` — API call counting
  11. Global request logging
  12. Rate limiters (per-endpoint)
  13. Route handlers
- **Auth middleware**: `middlewares/authFactory.js` exports `protect` (user), `adminProtect` (admin/superadmin/creator), `creatorProtect` (creator+), `superAdminProtect` (superadmin only). All verify JWT + check session validity in DB.
- **Sessions**: Token hashes stored in the `UserSession` model. Auth middleware validates session is active.
- **Audit logging**: `middlewares/auditLog.js` — `logAction` (admin), `logUserAction` (user), `logManual` (programmatic).
- **Cron jobs**: `src/cron.js` — runs via `setInterval` (no external scheduler):
  - Expired account deletion (every 6h)
  - Auto-complete episodes (every 1h)
  - Premiere release (every 30min)
- **Swagger**: `src/swagger.js` — JSDoc-based, scans `routes/*.js`. Available at `/api/docs` and `/api/v1/docs`.

## Key Conventions

- **CommonJS** — all backend files use `require()`/`module.exports`. No ESM.
- **Route pattern**: each route file is an Express Router. Auth middleware applied per-route, not globally.
- **Error handling**: use `asyncHandler` wrapper from `utils/errorHandler.js` to catch async errors. Throw `AppError(statusCode)` for operational errors.
- **Pagination**: use `paginate()` from `utils/paginate.js` — returns `{ list, page, limit, total, totalPages }`. Max page size capped at 100.
- **Password validation**: `validatePassword()` from `middlewares/security.js` — min 8 chars, requires letter + digit.
- **File uploads**: `multer` configured in `utils/upload.js`. Files served from `/uploads` with 7-day cache.
- **Rate limiting**: applied per-endpoint at the app level in `src/index.js`, not inside route files. Key limits:
  - Global: 300/min (translate routes exempt)
  - Login: 5/15min (user), 10/15min (admin)
  - Register: 3/hour
  - Password reset: 3/hour
  - 2FA: 5/15min
  - Email verify: 5/hour

## Gotchas

- **Dual API versioning**: every route is auto-mounted at both `/api/...` and `/api/v1/...`. Do not add `/v1/` manually in route files.
- **CSRF is enforced** on all non-GET requests. The frontend must fetch a CSRF token first (`GET /api/csrf-token`) and send it as `X-XSRF-TOKEN` header.
- **accountId migration**: on startup, the app auto-migrates users missing an `accountId` field. This is a one-time migration that runs every boot.
- **Auth tokens are dual**: JWT in `Authorization: Bearer` header **and** in the `token` cookie. Both are checked.
- **`sanitizeInput` strips `$`-prefixed keys and keys containing `.`** from req.body/query/params — this prevents MongoDB operator injection but means you cannot pass fields starting with `$` or containing `.` through the API.
- **No test suite exists**. The `npm test` script is a placeholder that exits with an error.
- **Cron uses `setInterval`**, not a proper cron library. Jobs start in `startCronJobs()` called at the end of `src/index.js`.
- **`uploads/` directory** is gitignored and must exist at runtime for file uploads to work.
