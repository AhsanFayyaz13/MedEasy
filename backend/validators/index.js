/**
 * Zod request schemas, grouped by resource. Used with middleware/validate.js.
 * Unknown keys are stripped (z.object default), so handlers never receive
 * unexpected fields (prevents mass-assignment).
 */
const { z } = require('zod');

// ── Primitives ─────────────────────────────────────────────────────
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const trimmed = (max = 200) => z.string().trim().max(max);
const optionalText = (max = 200) => z.string().trim().max(max).optional();
const email = z.string().trim().toLowerCase().email('Please enter a valid email address').max(254);
const phone = z.string().trim().min(7, 'Please enter a valid phone number').max(20);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password is too long')
  .refine((v) => !/^\$2[aby]\$/.test(v), 'Password format not allowed');
const otp = z.string().trim().min(4).max(4096); // 6-digit code or Firebase ID token
const money = z.coerce.number().min(0).max(10_000_000);
const bool = z.preprocess((v) => (v === 'false' || v === '0' ? false : v === 'true' || v === '1' ? true : v), z.boolean());
const emptyToUndefined = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Auth ───────────────────────────────────────────────────────────
// Self-registration can never create admin or staff-pharmacist accounts.
const SELF_REGISTER_ROLES = ['patient', 'doctor', 'pharmacy'];

const register = z
  .object({
    name: trimmed(120).min(2, 'Please enter your full name'),
    email: emptyToUndefined(email.optional()),
    phone,
    password,
    role: emptyToUndefined(z.enum(SELF_REGISTER_ROLES, { message: 'Invalid account type' }).default('patient')),
    address: optionalText(300),
    verificationChannel: z.enum(['email', 'phone']),
    // pharmacy
    pharmacyName: optionalText(150),
    pharmacyLocation: optionalText(300),
    pharmacyOutsidePicture: optionalText(1000),
    ownerName: optionalText(120),
    pharmacistName: optionalText(120),
    degreeName: optionalText(120),
    degreePlace: optionalText(200),
    licenseNumber: optionalText(60),
    // doctor
    specialty: optionalText(120),
    pmcRegistration: optionalText(60),
    degree: optionalText(120),
    experience: emptyToUndefined(z.coerce.number().int().min(0).max(70).optional()),
    clinicAddress: optionalText(300),
    availableDays: z.array(z.enum(WEEKDAYS)).max(7).optional(),
    consultationFee: emptyToUndefined(money.optional()),
  })
  .superRefine((d, ctx) => {
    if (d.verificationChannel === 'email' && !d.email) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Email address is required to receive the code by email' });
    }
    if (d.role === 'pharmacy' && (!d.pharmacyName || !d.pharmacyLocation || !d.pharmacyOutsidePicture)) {
      ctx.addIssue({ code: 'custom', path: ['pharmacyName'], message: 'Missing pharmacy registration details: name, location, or outside picture.' });
    }
    if (
      d.role === 'doctor' &&
      (!d.specialty || !d.pmcRegistration || !d.degree || d.experience === undefined || !d.clinicAddress || !d.availableDays?.length || d.consultationFee === undefined)
    ) {
      ctx.addIssue({ code: 'custom', path: ['specialty'], message: 'Missing professional doctor registration details.' });
    }
  });

const auth = {
  register,
  verifyRegistration: z.object({ phone, code: otp }),
  resend: z.object({ phone }),
  login: z
    .object({
      identifier: optionalText(254),
      email: optionalText(254),
      password: z.string().min(1, 'Password is required').max(128),
    })
    .refine((d) => d.identifier || d.email, { message: 'Email/Phone and password are required', path: ['identifier'] }),
  forgotPassword: z.object({ identifier: trimmed(254).min(3, 'Email or phone number is required.') }),
  resetPassword: z.object({ identifier: trimmed(254).min(3), code: z.string().trim().min(4).max(10), password }),
  updateProfile: z.object({
    name: optionalText(120),
    email: emptyToUndefined(email.optional()).or(z.literal('')),
    phone: optionalText(20),
    address: optionalText(300),
    pharmacyName: optionalText(150),
    specialty: optionalText(120),
    pmcRegistration: optionalText(60),
    degree: optionalText(120),
    experience: emptyToUndefined(z.coerce.number().int().min(0).max(70).optional()),
    clinicAddress: optionalText(300),
    availableDays: z.array(z.enum(WEEKDAYS)).max(7).optional(),
    consultationFee: emptyToUndefined(money.optional()),
  }),
  pharmacistDetails: z.object({
    name: trimmed(120).min(2, 'Representative name is required'),
    photo: optionalText(1000),
    licenseNumber: optionalText(60),
    age: emptyToUndefined(z.coerce.number().int().min(18).max(100).optional()),
    degreeName: optionalText(120),
    degreePlace: optionalText(200),
    email,
    password: emptyToUndefined(z.string().min(6, 'The password must be at least 6 characters long.').max(128).optional()),
  }),
};

// ── Medicines ──────────────────────────────────────────────────────
const medicineBase = {
  name: trimmed(200).min(1),
  brand: optionalText(120),
  description: trimmed(5000).min(1),
  category: trimmed(120).min(1),
  price: money,
  originalPrice: emptyToUndefined(money.optional()),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  requiresPrescription: bool.optional(),
  manufacturer: optionalText(200),
  expiryDate: emptyToUndefined(z.coerce.date().optional()),
  imageUrl: optionalText(1000),
};
const medicines = {
  list: z.object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    // Oversized limits are clamped (not rejected) so admin/inventory views can load the full catalogue.
    limit: z.coerce.number().int().min(1).default(10).transform((n) => Math.min(n, 500)),
    search: optionalText(100),
    category: optionalText(120),
  }),
  create: z.object(medicineBase),
  update: z.object(medicineBase).partial(),
};

// ── Orders ─────────────────────────────────────────────────────────
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'];
const orders = {
  place: z.object({
    items: z
      .array(z.object({ medicineId: objectId, quantity: z.coerce.number().int().min(1).max(100) }))
      .min(1, 'No order items')
      .max(50),
    prescriptionId: emptyToUndefined(objectId.optional()),
    shippingAddress: z.object({
      firstName: trimmed(60).min(1, 'First name is required'),
      lastName: trimmed(60).min(1, 'Last name is required'),
      address: trimmed(300).min(3, 'Address is required'),
      city: trimmed(80).min(2, 'City is required'),
      postalCode: optionalText(12),
      phone,
    }),
    paymentMethod: z.enum(['cod', 'jazz', 'easy', 'card']).default('cod'),
    notes: optionalText(500),
  }),
  status: z.object({ status: z.enum(ORDER_STATUSES, { message: 'Invalid status' }), reason: optionalText(500) }),
  listAll: z.object({ status: z.enum([...ORDER_STATUSES, 'all']).optional() }),
};

// ── Appointments ───────────────────────────────────────────────────
const time = z.string().trim().max(20);
const appointments = {
  book: z
    .object({ doctorId: objectId.optional(), doctor: objectId.optional(), date: z.string().min(1, 'Appointment date is required.'), time })
    .refine((d) => d.doctorId || d.doctor, { message: 'Doctor is required', path: ['doctorId'] }),
  update: z.object({
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
    consultationNotes: optionalText(5000),
    notes: optionalText(5000),
    prescription: optionalText(5000),
    date: emptyToUndefined(z.coerce.date().optional()),
    time: time.optional(),
  }),
};

// ── Prescriptions ──────────────────────────────────────────────────
const prescriptions = {
  verify: z.object({ status: z.enum(['pending', 'verified', 'rejected']), doctorId: emptyToUndefined(objectId.optional()) }),
  upload: z.object({ fileUrl: emptyToUndefined(z.string().url().max(1000).optional()), notes: optionalText(500) }),
};

// ── Reviews ────────────────────────────────────────────────────────
const TARGETS = ['medicine', 'doctor', 'pharmacy'];
const reviews = {
  add: z.object({
    targetType: z.enum(TARGETS).default('pharmacy'),
    targetId: objectId.default('000000000000000000000000'),
    rating: z.coerce.number().int().min(1, 'Rating must be 1–5').max(5, 'Rating must be 1–5'),
    comment: optionalText(2000),
  }),
  targetParams: z.object({ targetType: z.enum(TARGETS), targetId: objectId }),
  list: z.object({
    targetType: z.enum(TARGETS).optional(),
    targetId: objectId.optional(),
    limit: z.coerce.number().int().min(1).transform((n) => Math.min(n, 100)).optional(),
  }),
};

// ── Contact ────────────────────────────────────────────────────────
const contact = z.object({
  name: trimmed(120).min(2, 'Please provide Name, Email, Subject and Message.'),
  email,
  phone: optionalText(20),
  subject: trimmed(200).min(2, 'Please provide Name, Email, Subject and Message.'),
  message: trimmed(5000).min(5, 'Please provide Name, Email, Subject and Message.'),
});

// ── Admin ──────────────────────────────────────────────────────────
const ALL_ROLES = ['patient', 'pharmacist', 'doctor', 'admin', 'pharmacy'];
const admin = {
  createUser: z.object({
    name: trimmed(120).min(2),
    email: emptyToUndefined(email.optional()),
    password,
    role: z.enum(ALL_ROLES).default('patient'),
    phone,
    address: optionalText(300),
  }),
  role: z.object({ role: z.enum(ALL_ROLES, { message: 'Invalid role.' }) }),
  decline: z.object({ reason: optionalText(500) }),
};

module.exports = {
  objectId,
  idParam,
  auth,
  medicines,
  orders,
  appointments,
  prescriptions,
  reviews,
  contact,
  admin,
  SELF_REGISTER_ROLES,
};
