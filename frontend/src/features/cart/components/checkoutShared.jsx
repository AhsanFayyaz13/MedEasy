/* Checkout constants & validation */

// Must match the API (backend/controllers/orderController.js), which charges the same fee.
export const DELIVERY_FEE = 120;
export const FREE_THRESHOLD = 1000;

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on delivery', desc: 'Pay when your order arrives', disabled: false },
  { id: 'jazz', label: 'JazzCash', desc: 'Mobile wallet', disabled: true },
  { id: 'easy', label: 'EasyPaisa', desc: 'Mobile wallet', disabled: true },
  { id: 'card', label: 'Credit / debit card', desc: 'Visa, Mastercard, UnionPay', disabled: true },
];

export const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Quetta', 'Peshawar', 'Hyderabad', 'Sialkot'];

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

/** Must match the API upload limit (MAX_UPLOAD_BYTES, default 5 MB). */
export const MAX_FILE_MB = 5;

export function validateAddress(f) {
  const err = {};
  if (!f.firstName.trim()) err.firstName = 'First name is required.';
  if (!f.lastName.trim()) err.lastName = 'Last name is required.';
  if (f.address.trim().length < 3) err.address = 'Street address is required.';
  if (!f.city) err.city = 'Please select a city.';
  if (!f.phone.trim()) err.phone = 'Phone number is required.';
  else if (!/^[+]?[\d\s\-().]{7,15}$/.test(f.phone)) err.phone = 'Enter a valid phone number.';
  return err;
}

export function validateFile(file, required) {
  if (!file) return required ? 'A prescription is required for Rx items.' : null;
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return 'Only JPG, PNG, WebP or PDF files are accepted.';
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `File must be smaller than ${MAX_FILE_MB} MB.`;
  return null;
}
