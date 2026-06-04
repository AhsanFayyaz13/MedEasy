# 🏥 MedEasy — Full-Stack Digital Healthcare Portal

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=nodedotjs&logoColor=white&style=flat-square)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white&style=flat-square)](https://www.mongodb.com/)
[![Resend](https://img.shields.io/badge/Resend-Email_API-000000?style=flat-square)](https://resend.com/)

**MedEasy** is a responsive, full-stack digital healthcare application designed to connect patients, doctors, pharmacists, and administrators on a single platform. The portal supports role-based dashboards, secure registrations, real-time cart updates, and prescription uploads.

---

## ✨ Core Features

*   👥 **Multi-Role Dashboards**: Personalized workspaces for Patients, Doctors, Pharmacists, and Administrators to manage tasks relevant to their roles.
*   🔒 **Secure Account Verification**: Real-time 6-digit OTP verification via email/phone upon registration.
*   🛒 **Catalog & Shopping Cart**: Browse medicines, search the pharmacy catalog, and manage a persistent checkout cart.
*   📄 **Prescription Uploads**: Patients can securely upload doctor prescriptions when requesting order fulfillments.
*   📊 **Administrative Panel**: Manage user lists, view verification statuses, and approve medical practitioner requests.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), React Bootstrap, React Icons, HSL tailormade Vanilla CSS.
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB, Mongoose.
*   **Services**: Resend HTTP API (for transactional OTP/verification emails).

---

## 🚀 Local Setup & Configuration

### 1. Prerequisites
Make sure you have the following installed locally:
*   [Node.js](https://nodejs.org/) (v18.x or higher)
*   [MongoDB Community Server](https://www.mongodb.com/try/download/community)

---

### 2. Configure Environment Variables

Create a `.env` file inside the `backend` folder:
```ini
MONGO_URI=mongodb://localhost:27017/medeasy
JWT_SECRET=your_jwt_secret_key
FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174
MAX_UPLOAD_BYTES=5242880

# Resend Transactional Email API (Optional for Local Diagnostics)
RESEND_API_KEY=your_resend_api_key_here
SENDER_EMAIL=medeasy@medeasy.systems
```
*(If no `RESEND_API_KEY` is provided, OTP codes are logged directly in the backend terminal logs for local testing.)*

---

### 3. Install & Seed Database

From the root directory, install all dependencies:
```powershell
npm run install-all
```

Seed the database with default medicines and demo accounts:
```powershell
cd backend
npm run seed
```

---

### 4. Run the Application

Launch both the backend API and frontend client concurrently:
```powershell
npm run start
```
*   **Frontend Client**: `http://localhost:5173`
*   **Backend Server**: `http://localhost:5000`

---

## 👥 Demo Accounts

Use these pre-seeded accounts to explore the different portal interfaces:

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@medeasy.local` | `AdminPass123` | Approves registrations, views audit stats |
| **Doctor** | `doctor@medeasy.local` | `DoctorPass123` | Manages appointments, writes/views prescriptions |
| **Pharmacist** | `pharm@medeasy.local` | `PharmPass123` | Reviews medicine stocks, updates apothecary dashboard |
| **Patient** | `patient@medeasy.local` | `PatientPass123` | Browses catalog, uploads prescriptions, checks out |
