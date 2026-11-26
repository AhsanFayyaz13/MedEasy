/**
 * Patient feedback on orders: pharmacy ratings and complaints, sent to the MedEasy team
 * (admin Audits tab), plus how orders are named.
 */
import { submitFeedback } from '../../../services/api/feedbackService';

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

/** Rate a delivered order (rating it again replaces the earlier rating). */
export const saveOrderReview = (order, { rating, comment }) =>
  submitFeedback({ kind: 'rating', orderId: order.id, rating: Number(rating), text: comment || undefined });

/** Complain about an order; the admin team is alerted. */
export const saveOrderReport = (order, { issueType, details }) =>
  submitFeedback({ kind: 'order', orderId: order.id, category: issueType, text: details });