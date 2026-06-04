# MedEasy Run Guide

## 1. Install dependencies

From the repository root:

```powershell
npm run install-all
```

This installs dependencies for both the frontend and backend.

## 2. Configure the backend environment

Copy `backend/.env.example` to `backend/.env` and adjust values if needed:

```powershell
copy backend\.env.example backend\.env
```

Default values:

```text
MONGO_URI=mongodb://localhost:27017/medeasy
JWT_SECRET=your_jwt_secret
FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174
MAX_UPLOAD_BYTES=5242880
RESEND_API_KEY=your_resend_api_key_here
SENDER_EMAIL=medeasy@medeasy.systems
```

> If Vite starts on a different port, add that port to `FRONTEND_ORIGIN` as a comma-separated value. The server also accepts both `localhost` and `127.0.0.1` origins for local development.

## 3. Run the backend

Start the Express server from the repository root:

```powershell
npm run start-backend
```

The backend listens on `http://localhost:5000` by default.

## 4. Run the frontend

Start the React frontend from the repository root:

```powershell
npm run start-frontend
```

The frontend runs with Vite and will open on `http://localhost:5173` by default.

## 5. Run both services together

From the repository root:

```powershell
npm run start
```

This launches both frontend and backend concurrently.

## 6. Seed sample data

Seed the backend database with sample users and medicines:

```powershell
cd backend
npm run seed
```

Sample accounts:

- `admin@medeasy.local` / `AdminPass123`
- `pharm@medeasy.local` / `PharmPass123`
- `doctor@medeasy.local` / `DoctorPass123`
- `patient@medeasy.local` / `PatientPass123`

## 7. Verify the API

Health check:

```powershell
Invoke-WebRequest http://localhost:5000/api/health | ConvertFrom-Json
```

Expected response:

```json
{ "status": "ok", "timestamp": 1234567890000 }
```

## 8. Notes

- Frontend API base URL is configured in `frontend/.env` via `VITE_API_BASE_URL`.
- JWT tokens are stored in `localStorage` under `medeasy_access_token`.
- Uploaded prescriptions are saved to `backend/uploads`.
- CORS is configured to accept requests from `FRONTEND_ORIGIN`.
- Transactional Emails (verification codes and password recovery) are sent using the Resend HTTP API. If `RESEND_API_KEY` is not set locally, codes will fallback to being output to the backend console logs.
