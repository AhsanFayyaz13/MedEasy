# Security policy

MedEasy handles health information (prescriptions, consultations), so we take reports seriously.

## Reporting a vulnerability

Email **support@medeasy.systems** with the subject "Security". Please include what you found, how to
reproduce it and its impact. **Do not** open a public issue, access other people's data, or run tests that
could disrupt the service (load testing, spam, social engineering).

We aim to acknowledge reports within 3 working days and will keep you informed until the issue is fixed.

## Supported versions

Only the current `main` branch (what runs on medeasy.systems) receives security fixes.

## How the platform is protected

**Accounts and sessions**
- Passwords hashed with bcrypt (cost 12); verification and reset codes are random, stored hashed, compared
  in constant time, limited to 5 attempts and expire after 15 minutes.
- Login and forgot-password don't reveal whether an account exists (same answer, same timing).
- Sessions are JWTs (7 days) held in `sessionStorage`. Changing or resetting a password ends all other
  sessions; suspended accounts are rejected on every request.
- Doctors, pharmacies and pharmacist representatives can't sign in until an admin approves them.
- API responses never include password hashes, reset codes or other secrets.

**API**
- Role checks on every protected route; Zod validation on every input (unknown fields dropped).
- helmet headers, CORS allow-list, 100 kB body limit, NoSQL-operator stripping, rate limits on sign-in,
  codes, uploads, guest orders and the whole API.
- Prices, stock and delivery fees are always computed by the server.
- Only an appointment's patient and doctor can read or write its chat (admins can read). Notification
  emails never include message content.
- Complaints and ratings are accepted only about the sender's own appointments and orders; only admins can
  read them.
- Uploads: random filenames, extension and MIME type must match, size-limited, stored on Cloudinary.
- No internal error details in production responses; `Cache-Control: no-store` on signed-in responses.

**Website**
- Strict Content-Security-Policy (no inline scripts), HSTS, clickjacking protection, Permissions-Policy.
- CSV exports neutralise spreadsheet formulas.

**Dependencies** — `npm audit` is clean for production dependencies; run it before each release.

## Known gaps

- Uploaded prescriptions are served from unguessable but public URLs; signed URLs are planned.
