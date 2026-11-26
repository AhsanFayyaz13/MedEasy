# Changelog

Notable changes to MedEasy. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The site is
deployed continuously from `main`, so entries are grouped by date.

## Unreleased

### Added
- Pharmacy offers: when a patient sends a prescription, the pharmacist replies with what the pharmacy can
  supply (quantities, notes such as "15 days' supply, prescribed 20", alternatives, and medicines it can't
  supply) and the price. The patient accepts the lines they want within 48 hours and it becomes a confirmed
  order; alternatives are only included if they tick them. They can also say no thanks.
- Patients and the pharmacy can message each other about a prescription.
- "Order these medicines" on a completed consultation sends the doctor's prescription to the pharmacy, which
  replies with an offer.
- Checkout offers prescriptions the patient already sent, so an approved prescription no longer has to be
  uploaded again. Prescriptions can be used for 30 days and for one order, unless the pharmacist marks them
  as allowing repeat orders (then 6 months).
- Pharmacists can approve a prescription and confirm the order waiting on it in one step, and see the
  prescriptions they've reviewed, with who decided.
- Feedback, complaints about doctors and orders, and pharmacy ratings are now sent to the server, so
  admins see them from any device. Admins are alerted to new complaints, and patients are told when
  theirs has been reviewed. Rating an order again replaces the earlier rating.
- Patient–doctor chat now works between devices: messages are stored with the appointment, show when
  they've been seen, and close 3 days after the appointment. The other side gets a notification and one
  email per unread conversation (without the message).
- Notifications come from the server, so they reach people on any device: bookings, cancellations,
  order progress, prescription decisions, verifications and messages. Unread dots on Chat buttons.
- Partner Agreement (`/partner-agreement`): doctors and pharmacies accept a 10% commission at sign-up;
  existing partners accept it once in their dashboard. Each order and consultation records its commission;
  the admin overview shows commission for the month.
- Pharmacies now need admin approval before they can sign in, like doctors. Store and pharmacist
  representative are reviewed separately.
- Toasts redesigned as quiet, accessible notifications; redundant ones removed.

- Patients can delete expired and declined prescriptions. One that an order used disappears from their list
  but stays on record for the pharmacy.

### Removed
- Offline "mock data" mode and its datasets; use `npm run dev:memory` (real API on an in-memory database).
- Unused Firebase verification path on the server; verification codes must now be exactly 6 digits.
- Leftover styles from the pre-redesign pages and other unused code.
- Old documentation (project report, system specification, run guide), replaced by `docs/`.

### Fixed
- The pharmacist's Reviewed prescriptions failed to load: early prescriptions were stored inside the
  database record, and a page of them was too large for the server. Lists now leave those files out and load
  each one only when it is opened. The pharmacy's order list does the same.
- Appointment dates no longer depend on the server's time zone.
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
