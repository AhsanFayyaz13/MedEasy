/**
 * Patient feedback on orders: pharmacy ratings, complaints and cancellation alerts.
 *
 * NOTE: ratings and complaints are kept in localStorage (read by the admin Audits tab)
 * until the API has endpoints for them. Keep all writes here so that swap stays easy.
 * (Cancellations reach the pharmacy and admins as server notifications.)
 */

const REVIEWS_KEY = 'medeasy_pharmacy_reviews';
const REPORTS_KEY = 'medeasy_pharmacy_reports';
const DEFAULT_PHARMACY = 'MedEasy Pharmacy Partner';

export const shortOrderId = (id) => String(id || '').slice(-8).toUpperCase();

/** How an order is named everywhere: the number the customer was given (older orders: short id). */
export const orderRef = (order) => order?.orderNumber || `#${shortOrderId(order?.id || order?._id)}`;

export const RATING_OPTIONS = [
  { value: '5', label: '5 — Excellent' },
  { value: '4', label: '4 — Very good' },
  { value: '3', label: '3 — Good' },
  { value: '2', label: '2 — Fair' },
  { value: '1', label: '1 — Poor' },
];

export const REPORT_TYPES = [
  { value: 'wrong-medicine', label: 'Wrong medicine delivered' },
  { value: 'expired-medicine', label: 'Expired or damaged medicine' },
  { value: 'delay', label: 'Late or missed delivery' },
  { value: 'rider-conduct', label: 'Rider or pharmacist conduct' },
  { value: 'overcharging', label: 'Overcharged or wrong price' },
  { value: 'other', label: 'Something else' },
];

function append(key, entry) {
  const all = JSON.parse(localStorage.getItem(key) || '[]');
  all.push(entry);
  localStorage.setItem(key, JSON.stringify(all));
}

export function saveOrderReview(order, user, { rating, comment }) {
  append(REVIEWS_KEY, {
    id: `rev-${Date.now()}`,
    orderId: order.id,
    pharmacyName: order.pharmacyName || DEFAULT_PHARMACY,
    patientName: user?.name || 'Patient',
    patientEmail: user?.email || '',
    rating: Number(rating),
    comment,
    time: Date.now(),
  });
}

export function saveOrderReport(order, user, { issueType, details }) {
  append(REPORTS_KEY, {
    id: `rep-${Date.now()}`,
    orderId: order.id,
    pharmacyName: order.pharmacyName || DEFAULT_PHARMACY,
    patientName: user?.name || 'Patient',
    patientEmail: user?.email || '',
    issueType,
    details,
    status: 'pending',
    time: Date.now(),
  });
}
