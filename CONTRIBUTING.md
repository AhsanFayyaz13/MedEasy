# Contributing

## Setup

See [README](README.md#quick-start). For day-to-day work use `npm run dev:memory`: it runs the real API on
a seeded in-memory database, so nothing touches production data.

> Never point local testing at the production database: registrations and orders made while testing
> would be real.

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
2. Keep each commit to one logical change.
3. Before pushing, run the quality gate from the repo root — all three must pass:

   ```bash
   npm run lint    # ESLint (0 errors) + Stylelint
   npm test        # backend integration tests
   npm run build   # production build
   ```

4. Open a pull request into `main` and fill in the template. Vercel and Render deploy from `main`.

### Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, e.g.
`fix(orders): restock once when an order is cancelled twice`. Types: `feat`, `fix`, `docs`, `style`,
`refactor`, `perf`, `test`, `chore`. Explain *why* in the body when it isn't obvious.

## Conventions

**Backend**
- Route → Zod validator (`validators/index.js`) → controller. Every new endpoint gets a validator and the
  right `protect` / `authorizeRoles` guard.
- Throw `AppError(status, message, code)`; the central handler formats the response.
- Never trust the client for prices, totals, roles or ownership.
- Return users through `res.json(user)` or `User.toPublic(user)` so secrets are stripped.
- Add a test in `backend/tests/` for each bug fix and each new rule; tests must not call real
  third-party services.

**Frontend**
- Put code in `src/features/<domain>/`; reuse `src/components/ui/` before writing new UI.
- Colours, sizes and shadows come from `src/styles/tokens.css` (Stylelint enforces this).
- API calls live in `src/services/api/`; format prices, dates and phones with `src/lib/format.js`.
- Every page has one `<h1>`, labelled form fields and keyboard access; check light and dark themes and a
  390 px wide screen.
- Only show real data: no invented ratings, counts or testimonials.

**Security-sensitive changes** (auth, payments, uploads, headers): mention it in the pull request and
update [SECURITY.md](SECURITY.md) if behaviour changes. If a change adds an outside service, update the
Content-Security-Policy in both `frontend/vercel.json` and `frontend/public/_headers`.

## Documentation

Update the relevant file in `docs/` and add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
