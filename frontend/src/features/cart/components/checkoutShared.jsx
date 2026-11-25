/* Shared constants & helpers (extracted from Checkout.jsx) */

export const DELIVERY_FEE    = 120;

export const FREE_THRESHOLD  = 1000;

export const PAYMENT_METHODS = [
  { id: 'cod',   label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives', disabled: false },
  { id: 'jazz',  label: 'JazzCash',          icon: '📱', desc: 'Pay via JazzCash mobile wallet', disabled: true },
  { id: 'easy',  label: 'EasyPaisa',         icon: '📲', desc: 'Pay via EasyPaisa mobile wallet', disabled: true },
  { id: 'card',  label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, UnionPay', disabled: true },
];

export const CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Quetta','Peshawar','Hyderabad','Sialkot'];

export const ALLOWED_FILE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

export const MAX_FILE_MB = 10;

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateAddress(fields) {
  const err = {};
  if (!fields.firstName.trim())  err.firstName  = 'First name is required.';
  if (!fields.lastName.trim())   err.lastName   = 'Last name is required.';
  if (!fields.address.trim())    err.address    = 'Street address is required.';
  if (!fields.city)              err.city       = 'Please select a city.';
  if (!fields.phone.trim())      err.phone      = 'Phone number is required.';
  else if (!/^[+]?[\d\s\-().]{7,15}$/.test(fields.phone))
                                 err.phone      = 'Enter a valid phone number.';
  return err;
}


export function validateFile(file, required) {
  if (!file && required) return 'Prescription file is required for Rx items.';
  if (!file)             return null;
  if (!ALLOWED_FILE_TYPES.includes(file.type))
    return 'Only JPG, PNG, WebP, or PDF files are accepted.';
  if (file.size > MAX_FILE_MB * 1024 * 1024)
    return `File must be smaller than ${MAX_FILE_MB} MB.`;
  return null;
}
