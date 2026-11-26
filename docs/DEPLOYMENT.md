# Deployment

Production runs the API on **Render** and the website on **Vercel** (Netlify works too; both are configured).

## Backend (Render)

- Root directory `backend` · build `npm install` · start `npm start` · health check path `/api/health`
  (returns 503 while the database is unreachable, so Render restarts the service).
- Node version comes from `engines` in `package.json` (≥ 20.19).

### Environment variables

Validated at startup by `backend/config/env.js`; the server refuses to start if a required one is missing.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | ✅ in production | `development` | Must be `production` live: hides internal errors, strict CORS, no codes in logs |
| `MONGO_URI` | ✅ | – | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | – | ≥ 32 random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Changing it signs everyone out |
| `JWT_EXPIRES_IN` | – | `7d` | Session lifetime |
| `FRONTEND_ORIGIN` | ✅ in production | localhost | Comma-separated origins allowed by CORS (`https://medeasy.systems` and `www.` are always allowed) |
| `PORT` | – | `5000` | Render sets this |
| `TRUST_PROXY` | – | `1` | Proxy hops in front of the API (correct client IPs for rate limiting) |
| `MAX_UPLOAD_BYTES` | – | `5242880` | Upload size limit (5 MB) |
| `RESEND_API_KEY`, `SENDER_EMAIL` | ✅ for email | – | Verification codes, password resets, contact form, decisions |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✅ for uploads | – | Prescriptions, photos |
| `CLOUDINARY_FOLDER` | – | `Medeasy Uploads` | Cloudinary folder |

## Frontend (Vercel / Netlify)

- Root directory `frontend` · build `npm run build` · output `dist`.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Production Render API | API base URL including `/api` |
| `VITE_SITE_URL` | `https://medeasy.systems` | Canonical URLs and social tags |
| `VITE_MAP_TILE_URL` | OpenStreetMap | Map tiles for the checkout pin (a tile provider's URL with key) |
| `VITE_MAP_ATTRIBUTION` | OpenStreetMap credit | Attribution your tile provider requires |

All `VITE_*` values are compiled into the public bundle — never put secrets in them.

### Headers, caching and routing

Configured in `frontend/vercel.json` (Vercel) and `frontend/public/_headers` + `_redirects` (Netlify).
**Keep the two in sync.**

- Every route serves `index.html` (deep links work); real files are served first.
- Content-Security-Policy with no inline scripts, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  Referrer-Policy, Permissions-Policy (location allowed for this site only, for the checkout map).
- Hashed files in `/assets/` are cached for a year.

The CSP lists the outside services the site may contact. **If one changes, update both files:**

| Service | Directive |
| --- | --- |
| API (`medeasy-backend-a5yi.onrender.com`) | `connect-src`, `img-src` — also the `preconnect` link in `index.html` |
| Cloudinary (`res.cloudinary.com`) | `img-src` |
| Map tiles (`tile.openstreetmap.org`) | `img-src` |
| Place search (`nominatim.openstreetmap.org`) | `connect-src` |

## Go-live checklist

- [ ] `NODE_ENV=production`, `FRONTEND_ORIGIN` and a fresh random `JWT_SECRET` set on Render
- [ ] Email: `RESEND_API_KEY` set and the sender domain verified in Resend
- [ ] Cloudinary keys set
- [ ] `/api/health` returns `{"status":"ok","database":"up"}`
- [ ] Business details filled in `frontend/src/lib/business.js` (legal name, licence numbers)
- [ ] Legal pages reviewed by a lawyer (refund window and timings are placeholders)
- [ ] Never run `npm run seed` against the production database (it deletes data)
- [ ] MongoDB Atlas backups enabled; database user limited to the MedEasy database
- [ ] Optional: uptime monitor on `/api/health`; error tracking (e.g. Sentry)
- [ ] Heavy traffic: switch to a paid map-tile and search provider (OpenStreetMap's free servers are for light use)
