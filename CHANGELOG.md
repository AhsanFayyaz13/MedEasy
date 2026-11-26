# Changelog

Notable changes to MedEasy. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The site is
deployed continuously from `main`, so entries are grouped by date.

## Unreleased

### Added
- Partner Agreement (`/partner-agreement`): doctors and pharmacies accept a 10% commission at sign-up;
  existing partners accept it once in their dashboard. Each order and consultation records its commission;
  the admin overview shows commission for the month.
- Pharmacies now need admin approval before they can sign in, like doctors. Store and pharmacist
  representative are reviewed separately.
- Toasts redesigned as quiet, accessible notifications; redundant ones removed.

### Removed
- Offline "mock data" mode and its datasets; use `npm run dev:memory` (real API on an in-memory database).
- Unused Firebase verification path on the server; verification codes must now be exactly 6 digits.
- Leftover styles from the pre-redesign pages and other unused code.
- Old documentation (project report, system specification, run guide), replaced by `docs/`.

### Fixed
- The booking page showed a made-up 4.7 rating for every doctor, and turned a free consultation into
  Rs. 1,000. Only real profile data is shown now.

### Added
- Documentation set: architecture, API reference, deployment guide, security policy, contributing guide.
- `engines` (Node ≥ 20.19) in every `package.json` and `.nvmrc`.

## 2026-11-25 — Redesign, security hardening and delivery map

### Added
- Delivery map pin at checkout (optional), with "use my location" and place search; riders get a Google
  Maps link. Rider notes are now saved with the order.
- Guest checkout for over-the-counter medicines and order tracking by number + phone.
- Change password (ends other sessions), "application received" flow for doctors, legal pages, public
  contact page, editable reviews, verification decision emails.
- Security headers and strict Content-Security-Policy for the website; gzip and a database-aware health
  check for the API.

### Changed
- Every page rebuilt on a shared design system with light and dark themes, role-aware navigation and
  dashboards, mobile-first layouts and accessibility fixes.
- Sign-up verifies by email only. Sessions last 7 days.

### Fixed
- Password hashes of pharmacist representatives were included in API responses.
- A wrong password reloaded the login page and hid the error.
- Delivery fee calculated on the server; restocking on cancellation; prescription orders.
- Login and forgot-password no longer reveal whether an account exists.
- Patched vulnerable dependencies (multer, proxy-addr, morgan and 14 frontend advisories).

## 2026-06 — Media, sessions and email

- Cloudinary uploads for prescriptions and photos; seed images served from the API.
- Per-tab sessions (`sessionStorage`).
- Transactional email moved to Resend.

## 2026-05 — First version

- React frontend and Express/MongoDB API: catalogue, cart, prescriptions, appointments, and pharmacy, doctor
  and admin dashboards. Database moved to MongoDB Atlas; API deployed on Render.
