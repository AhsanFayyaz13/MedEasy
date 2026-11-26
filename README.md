# MedEasy

Online pharmacy and doctor-booking platform for Pakistan — [medeasy.systems](https://medeasy.systems).

Patients order medicines (over-the-counter without an account), upload prescriptions for a pharmacist to
verify, and book verified doctors. Pharmacies manage inventory, orders and prescriptions; doctors manage
consultations and e-prescriptions; administrators verify professionals and run the platform.

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, react-bootstrap (themed by design tokens), Chart.js, Leaflet |
| Backend | Node.js 20.19+, Express 5, Mongoose 9 (MongoDB), Zod, helmet, express-rate-limit |
| Services | MongoDB Atlas, Cloudinary (uploads), Resend (email), OpenStreetMap (checkout map) |
| Hosting | Vercel or Netlify (frontend), Render (API) |

## Quick start

Requires **Node.js 20.19+** (22 LTS recommended, see `.nvmrc`). MongoDB is optional for local development.

```bash
npm install && npm run install-all            # root, backend and frontend dependencies
cp backend/.env.example backend/.env          # set JWT_SECRET (and MONGO_URI for a real database)
cp frontend/.env.example frontend/.env

npm run dev:memory    # API on a seeded in-memory database + frontend — no MongoDB needed
# or
npm start             # API (:5000) + frontend (:5173) against MONGO_URI
```

Open <http://localhost:5173>. Health check: <http://localhost:5000/api/health>.

**Demo accounts** (seeded by `dev:memory` or `npm run seed --prefix backend`, never in production):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@medeasy.local` | `AdminPass123` |
| Pharmacy owner | `pharmacy@medeasy.local` | `PharmacyPass123` |
| Pharmacy representative | `rep@medeasy.local` | `RepPass123` |
| Pharmacist | `pharm@medeasy.local` | `PharmPass123` |
| Doctor | `doctor@medeasy.local` | `DoctorPass123` |
| Patient | `patient@medeasy.local` | `PatientPass123` |

In development without an email key, verification and reset codes are printed in the API console.

## Scripts

| Command (repo root) | What it does |
| --- | --- |
| `npm start` | API with auto-reload + frontend dev server |
| `npm run dev:memory` | Same, on a seeded in-memory database |
| `npm run lint` | ESLint (frontend, backend) and Stylelint |
| `npm test` | Backend integration tests (in-memory MongoDB) |
| `npm run build` | Production frontend build (`frontend/dist`) |
| `npm run seed --prefix backend` | Reset the database to demo data (**destructive**) |

## Project layout

```
backend/    Express API — routes → validators (Zod) → controllers → models; tests/ uses node:test
frontend/   React SPA — src/features/<domain>/ per feature, src/components/ui/ design system
docs/       Architecture, API reference and deployment guide
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — how the system fits together, data model, auth and sessions
- [API reference](docs/API.md) — every endpoint, who may call it, error format
- [Deployment](docs/DEPLOYMENT.md) — environment variables, hosting, security headers, go-live checklist
- [Contributing](CONTRIBUTING.md) — workflow, conventions and the quality gate
- [Security](SECURITY.md) — reporting a vulnerability and the security model
- [Changelog](CHANGELOG.md)

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).
