# API reference

Base URL: `https://<api-host>/api` (local: `http://localhost:5000/api`).

## Conventions

- **Auth:** `Authorization: Bearer <token>` from login or verification. "Public" endpoints need no token.
- **Validation:** bodies, params and queries are checked with Zod (`backend/validators/index.js`); unknown
  fields are dropped.
- **Errors** always have this shape:

  ```json
  { "success": false, "message": "Invalid status", "error": { "code": "VALIDATION_ERROR", "message": "Invalid status", "details": [] } }
  ```

  `400` invalid input · `401` not signed in, wrong password or ended session · `403` wrong role, suspended or
  pending approval · `404` not found · `409` duplicate · `413` body too large · `429` rate limited · `500`
  unexpected (no internals in production).
- **Rate limits:** 600 requests / 15 min per IP overall (polling for notifications and chat messages is
  instead limited to 900 / 15 min per user; sending messages 30 / min per user); sign-in, sign-up, codes and password changes
  10 / 15 min per IP + identifier; uploads and contact form 20 / hour; guest orders and tracking 10 / hour.
- **Caching:** responses to signed-in requests are `Cache-Control: private, no-store`.

Roles: `patient`, `doctor`, `pharmacy` (owner), `pharmacist` (representative), `admin`. Where a route says
**pharmacist**, pharmacy owners are allowed too.

## Health

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | `200 {status:"ok", database:"up"}`, or `503` when the database is unreachable |

## Auth & profile — `/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Start sign-up (patient, doctor or pharmacy; partners must send `acceptPartnerAgreement: true`); emails a 6-digit code |
| POST | `/auth/verify-registration` | Public | `{phone, code}` → session; doctors and pharmacies get `{pendingReview:true}` and no token |
| POST | `/auth/resend-verification` | Public | Send a new code |
| POST | `/auth/login` | Public | `{identifier (email or phone), password}` → `{…profile, token}` |
| POST | `/auth/forgot-password` | Public | Emails a reset code; same reply whether or not the account exists |
| POST | `/auth/reset-password` | Public | `{identifier, code, password}`; ends other sessions |
| POST | `/auth/upload-pharmacy-image` | Public | Storefront photo during pharmacy sign-up (image only) |
| GET | `/auth/profile` | Signed in | Current profile |
| PUT | `/auth/profile` | Signed in | Update profile (changing a doctor's PMC number re-triggers review) |
| POST | `/auth/partner-agreement` | Doctor, pharmacy owner | `{version}` — accept the current Partner Agreement (409 if the version is outdated) |
| PUT | `/auth/password` | Signed in (not representatives) | `{currentPassword, newPassword}` → new token; other sessions end |
| POST | `/auth/profile/photo` | Signed in | Profile photo |
| PUT | `/auth/profile/pharmacist` | Pharmacy | Add or update the pharmacist representative (needs admin approval) |
| DELETE | `/auth/profile/pharmacist` | Pharmacy | Remove the representative (revokes their access) |
| POST | `/auth/upload-pharmacist-photo` | Pharmacy | Representative photo |

## Medicines — `/medicines`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/medicines?page&limit&search&category` | Public | Paginated catalogue (`limit` max 500) |
| GET | `/medicines/:id` | Public | One medicine |
| POST | `/medicines` | Pharmacist, admin | Create |
| PUT | `/medicines/:id` | Pharmacist, admin | Update |
| DELETE | `/medicines/:id` | Admin | Delete |
| POST | `/medicines/upload-photo` | Pharmacist, admin | Product photo |

## Orders — `/orders`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/orders` | Patient, or guest (OTC only) | `{items:[{medicineId, quantity}], shippingAddress:{firstName, lastName, address, city, postalCode?, phone, notes?, location?:{lat,lng}}, paymentMethod, prescriptionId?, guestEmail?}`. Prices, stock and delivery fee are decided by the server; a pin outside Pakistan is rejected |
| GET | `/orders` | Patient | Own orders |
| GET | `/orders/:id` | Owner, pharmacist, admin | One order |
| DELETE | `/orders/:id` | Owner | Cancel before dispatch (`{reason?}`) |
| POST | `/orders/track` | Public | Guests: `{orderNumber, phone}` → order status |
| POST | `/orders/track/cancel` | Public | Guests: cancel by number + phone |
| GET | `/orders/all?status` | Pharmacist, admin | All orders |
| PUT | `/orders/:id/status` | Pharmacist, admin | `{status, reason?}`; cancelling restocks |

## Prescriptions — `/prescriptions`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/prescriptions` | Patient (own); pharmacist, admin (pending queue) | List |
| POST | `/prescriptions/upload` | Patient | Multipart `prescription` (JPG, PNG, WebP or PDF) + `notes` |
| DELETE | `/prescriptions/:id` | Patient | Delete own |
| PUT | `/prescriptions/:id/verify` | Pharmacist, admin | `{status: verified|rejected, rejectionReason?}` |

## Doctors & appointments

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/doctors` | Signed in | Approved, active doctors |
| GET | `/appointments` | Signed in | Patient: own bookings · doctor: their schedule · pharmacist, admin: all |
| POST | `/appointments/book` | Patient | `{doctorId, date, time, reason?}` |
| PUT / PATCH | `/appointments/:id` | Doctor, admin (any change); patient (cancel only) | Complete with notes and e-prescription, reschedule, or cancel |

## Chat — `/appointments/:id/messages`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/appointments/:id/messages?after` | The appointment's patient and doctor; admins (read-only) | `{messages:[{id, senderRole, text, createdAt, readAt}], canSend, closesAt}`; with `after` (ISO time) only newer messages. Opening marks the other side's messages read |
| POST | `/appointments/:id/messages` | The appointment's patient and doctor | `{text}` (1–2,000 characters); `400 CHAT_CLOSED` once cancelled or 3 days after the appointment. Notifies the other side (one alert and one email per unread conversation; the email never includes the message) |

## Notifications — `/notifications`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/notifications?limit` | Signed in | `{items:[{id, type, text, link, thread, read, createdAt}], unread}`, newest first (max 50). Deleted after 90 days |
| PUT | `/notifications/:id/read` | Recipient | Mark one as read |
| PUT | `/notifications/read-all` | Signed in | Mark all as read |

Types: `booking`, `cancel`, `chat`, `prescription`, `order`, `account`, `system`.

## Reviews — `/reviews`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/reviews?targetType&targetId&limit` | Public | Reviews (default target: the MedEasy service) |
| GET | `/reviews/:targetType/:targetId` | Public | Reviews of one medicine, doctor or pharmacy |
| GET | `/reviews/:targetType/:targetId/average` | Public | Average rating and count |
| POST | `/reviews` | Signed in | `{targetType, targetId, rating 1–5, comment}`; one per user per target |
| PUT | `/reviews/:id` | Author | Edit |
| DELETE | `/reviews/:id` | Author, admin | Delete |

## Contact — `/contacts`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/contacts` | Public (account details used when signed in) | `{name, email, phone?, subject, message}`; emailed to support |

## Admin — `/admin` (admin only)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/users` | User counts by role |
| GET | `/admin/users/all` | All users (no secrets) |
| GET | `/admin/users/pending` | Doctors, pharmacies and pharmacy representatives awaiting approval |
| POST | `/admin/users` | Create an account (auto-verified) |
| PUT | `/admin/users/:id/status` | Suspend or reactivate |
| PUT | `/admin/users/:id/role` | Change role |
| PUT | `/admin/users/:id/approve` | `{subject?: account\|representative}` — approve the doctor or pharmacy account, or the pharmacy's representative (emails them) |
| PUT | `/admin/users/:id/decline` | `{reason, subject?}` — decline; declining a representative leaves the store working (emails them) |
| DELETE | `/admin/users/:id` | Delete a user |
| GET | `/admin/sales` | Sales report |
| GET | `/admin/inventory` | Inventory report |
| GET | `/admin/prescriptions/analytics` | Prescription statistics |
