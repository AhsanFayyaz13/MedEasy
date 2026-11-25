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
