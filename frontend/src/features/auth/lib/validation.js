/** Client-side validation for the auth flows (mirrors backend/validators). */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[+]?[\d\s\-().]{7,15}$/;
export const MIN_PASSWORD = 8;

export const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Gynecologist',
  'Psychiatrist',
  'Orthopedist',
  'Neurologist',
  'Ophthalmologist',
  'ENT Specialist',
];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const REGISTER_INITIAL = {
  name: '',
  email: '',
  phone: '',
  role: '',
  password: '',
  confirmPassword: '',
  ownerName: '',
  pharmacyLocation: '',
  pharmacyOutsidePicture: '',
  specialty: '',
  pmcRegistration: '',
  degree: '',
  experience: '',
  clinicAddress: '',
  availableDays: [],
  consultationFee: '',
  acceptTerms: false,
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

export function validateLogin({ identifier, password }) {
  const errors = {};
  if (blank(identifier)) errors.identifier = 'Email address or phone number is required.';
  else if (!EMAIL_RE.test(identifier) && !PHONE_RE.test(identifier)) errors.identifier = 'Please enter a valid email address or phone number.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegister(f) {
  const errors = {};
  const isPharmacy = f.role === 'pharmacy';

  if (blank(f.name)) errors.name = isPharmacy ? 'Pharmacy name is required.' : 'Full name is required.';
  else if (f.name.trim().length < 2) errors.name = 'Must be at least 2 characters.';

  if (blank(f.email)) errors.email = 'Email address is required — we’ll send your verification code there.';
  else if (!EMAIL_RE.test(f.email)) errors.email = 'Please enter a valid email address.';

  if (blank(f.phone)) errors.phone = 'Phone number is required.';
  else if (!PHONE_RE.test(f.phone)) errors.phone = 'Please enter a valid phone number.';

  if (isPharmacy) {
    if (blank(f.ownerName)) errors.ownerName = 'Owner name is required.';
    if (blank(f.pharmacyLocation)) errors.pharmacyLocation = 'Pharmacy address is required.';
    if (!f.pharmacyOutsidePicture) errors.pharmacyOutsidePicture = 'A photo of the storefront is required.';
  }

  if (f.role === 'doctor') {
    if (!f.specialty) errors.specialty = 'Specialty is required.';
    if (blank(f.pmcRegistration)) errors.pmcRegistration = 'PMC/PMDC registration number is required.';
    if (blank(f.degree)) errors.degree = 'Medical degree is required.';
    if (blank(f.experience)) errors.experience = 'Years of experience is required.';
    else if (Number(f.experience) < 0) errors.experience = 'Experience cannot be negative.';
    if (blank(f.clinicAddress)) errors.clinicAddress = 'Clinic address is required.';
    if (blank(f.consultationFee)) errors.consultationFee = 'Consultation fee is required.';
    else if (Number(f.consultationFee) < 0) errors.consultationFee = 'Fee cannot be negative.';
    if (!f.availableDays?.length) errors.availableDays = 'Select at least one available day.';
  }

  if (!f.password) errors.password = 'Password is required.';
  else if (f.password.length < MIN_PASSWORD) errors.password = `Password must be at least ${MIN_PASSWORD} characters.`;

  if (!f.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (f.password !== f.confirmPassword) errors.confirmPassword = 'Passwords do not match.';

  if (!f.acceptTerms) errors.acceptTerms = 'Please accept the Terms of Service and Privacy Policy to continue.';

  return errors;
}

/** 0–4 strength score with a label and tone. */
export function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', tone: 'neutral' };
  let score = 0;
  if (pwd.length >= MIN_PASSWORD) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const levels = [
    { label: 'Very weak', tone: 'error' },
    { label: 'Weak', tone: 'error' },
    { label: 'Fair', tone: 'warning' },
    { label: 'Good', tone: 'primary' },
    { label: 'Strong', tone: 'success' },
    { label: 'Very strong', tone: 'success' },
  ];
  return { score, ...levels[score] };
}

/** Build the API payload for /auth/register from form fields. */
export function toRegisterPayload(f) {
  const payload = {
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    role: f.role,
    password: f.password,
    verificationChannel: 'email',
    acceptTerms: f.acceptTerms === true,
  };
  if (f.role === 'pharmacy') {
    Object.assign(payload, {
      pharmacyName: f.name.trim(),
      ownerName: f.ownerName.trim(),
      pharmacyLocation: f.pharmacyLocation.trim(),
      pharmacyOutsidePicture: f.pharmacyOutsidePicture,
    });
  }
  if (f.role === 'doctor') {
    Object.assign(payload, {
      specialty: f.specialty,
      pmcRegistration: f.pmcRegistration.trim(),
      degree: f.degree.trim(),
      experience: Number(f.experience),
      clinicAddress: f.clinicAddress.trim(),
      availableDays: f.availableDays,
      consultationFee: Number(f.consultationFee),
    });
  }
  return payload;
}
