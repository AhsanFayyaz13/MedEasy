# MedEasy

Local setup for MedEasy fullstack app (backend + frontend).

## Backend (Express + MongoDB)

1. Copy `backend/.env.example` to `backend/.env` and set values:

```
MONGO_URI=mongodb://localhost:27017/medeasy
JWT_SECRET=your_jwt_secret
FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174
MAX_UPLOAD_BYTES=5242880
```

> Tip: The backend allows requests from both `localhost` and `127.0.0.1` on the configured frontend ports.

2. Install and run:

```powershell
npm run install-all
npm run start-backend
```

> Or run both frontend and backend together from the repository root:
>
> ```powershell
> npm run start
> ```
>
3. Seed the database with sample users & medicines:

```powershell
cd backend
npm run seed
```

- Sample users created:
  - `admin@medeasy.local` / `AdminPass123` (admin)
  - `pharm@medeasy.local` / `PharmPass123` (pharmacist)
  - `doctor@medeasy.local` / `DoctorPass123` (doctor)
  - `patient@medeasy.local` / `PatientPass123` (patient)

4. Healthcheck: `GET /api/health` returns `{ status: 'ok' }`.

Notes:
- Uploads are stored in the `uploads/` folder. Max file size controlled by `MAX_UPLOAD_BYTES`.
- CORS allows `FRONTEND_ORIGIN`.

## Frontend (Vite + React)

1. Create `.env` in `frontend` with API base URL (optional):

```
VITE_API_BASE_URL=http://localhost:5000/api
```

2. Install and run:

```powershell
cd frontend
npm install
npm run dev
```

## Deployment

You can deploy the backend to Render or Railway and frontend to Vercel/Netlify. After deploying backend, set `VITE_API_BASE_URL` (frontend) or `REACT_APP_API_URL` accordingly and redeploy.

**Optional:** Add CI to run the seed script on initial deployment for staging environments.
