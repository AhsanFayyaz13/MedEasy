/**
 * Patient feedback on orders: pharmacy ratings, complaints and cancellation alerts.
 *
 * NOTE: ratings and complaints are kept in localStorage (read by the admin Audits tab)
 * until the API has endpoints for them. Keep all writes here so that swap stays easy.
 */
import { sendNotification } from '../../../lib/notifications';

const REVIEWS_KEY = 'medeasy_pharmacy_reviews';
const REPORTS_KEY = 'medeasy_pharmacy_reports';
const DEFAULT_PHARMACY = 'MedEasy Pharmacy Partner';

export const shortOrderId = (id) => String(id || '').slice(-8).toUpperCase();

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

const excerpt = (text, n = 60) => (text.length > n ? `${text.slice(0, n)}…` : text);

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
  sendNotification('admin', null, {
    text: `Pharmacy review: ${user?.name || 'A patient'} rated order #${shortOrderId(order.id)} ${rating}/5 — “${excerpt(comment)}”`,
    emoji: 'star',
    link: '/admin?tab=audits',
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
  sendNotification('admin', null, {
    text: `Pharmacy complaint: ${user?.name || 'A patient'} reported a problem with order #${shortOrderId(order.id)} — “${excerpt(details)}”`,
    emoji: 'complaint',
    link: '/admin?tab=audits',
  });
}

export function notifyOrderCancelled(order, reason) {
  const text = `Order cancelled: the patient cancelled order #${shortOrderId(order.id)}.${reason ? ` Reason: ${reason}` : ''}`;
  sendNotification('admin', null, { text, emoji: 'cancel', link: '/admin?tab=orders' });
  sendNotification('pharmacist', null, { text, emoji: 'cancel', link: '/pharmacist' });
}
