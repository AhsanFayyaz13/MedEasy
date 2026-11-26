/** Shared helpers for a pharmacy's offer on a prescription (patient and pharmacist screens). */
import { DELIVERY_FEE, FREE_THRESHOLD } from '../../cart/components/checkoutShared';

/** Must match the API (OFFER_HOURS in backend/models/Prescription.js). */
export const OFFER_HOURS = 48;

export const rxLabel = (rx) => `#RX-${String(rx?.id || rx?._id || '').slice(-6).toUpperCase()}`;

export const lineTotal = (line) => line.price * line.quantity;

/** Subtotal, delivery and total for the chosen lines, as the API will charge them. */
export function offerTotals(lines) {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const delivery = subtotal >= FREE_THRESHOLD || !lines.length ? 0 : DELIVERY_FEE;
  return { subtotal, delivery, total: subtotal + delivery };
}

/** "18 h 20 min" style time left text, or null once expired. */
export function timeLeft(expiresAt, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
}
