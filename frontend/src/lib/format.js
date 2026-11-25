/** Shared display formatters (PKR currency, dates). */

const pkr = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });

/** formatPrice(1250) → "Rs. 1,250" */
export function formatPrice(value) {
  const n = Number(value);
  return `Rs. ${pkr.format(Number.isFinite(n) ? n : 0)}`;
}

/** formatDate('2026-05-01') → "1 May 2026" */
export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', options);
}

/**
 * Pakistani numbers for display/editing.
 * formatPhone('923004444444') → "0300 4444444"; anything unrecognised is returned unchanged.
 */
export function formatPhone(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  const local = digits.startsWith('92') && digits.length === 12 ? `0${digits.slice(2)}` : digits;
  return /^03\d{9}$/.test(local) ? `${local.slice(0, 4)} ${local.slice(4)}` : String(value);
}

/** tel: link target in international form: "+923004444444". */
export function phoneHref(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
  return digits ? `+${digits}` : '';
}
