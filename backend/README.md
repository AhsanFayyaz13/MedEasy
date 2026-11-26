# MedEasy — API

Express 5 + MongoDB (Mongoose) REST API. Setup and scripts are in the [root README](../README.md); every
endpoint is listed in [docs/API.md](../docs/API.md) and environment variables in
[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

```bash
npm run dev          # API with auto-reload on :5000 (needs MONGO_URI in .env)
npm run dev:memory   # API on a seeded in-memory database
npm test             # integration tests (in-memory MongoDB, no real email or uploads)
npm run seed         # reset the database to demo data — destructive, never in production
```

Request path: `routes/` (auth guard, rate limit, Zod validator from `validators/`) → `controllers/` →
`models/`. Errors are thrown as `AppError` and formatted by `middleware/errorHandler.js`.
