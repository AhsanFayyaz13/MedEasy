/**
 * Partner Agreement for doctors and pharmacies (shown at sign-up and on the /partner-agreement page).
 * Bump VERSION whenever the agreement text changes: partners who accepted an older version are asked
 * to accept again on their next visit to their dashboard. Keep in sync with frontend/src/lib/business.js.
 */
const PARTNER_AGREEMENT = Object.freeze({
  VERSION: '2026-11-26',
  COMMISSION_RATE: 0.1, // 10% of each order's medicines subtotal / each consultation fee
});

/** Commission in whole rupees on an amount (rounded to the nearest rupee). */
const commissionOn = (amount) => Math.round((Number(amount) || 0) * PARTNER_AGREEMENT.COMMISSION_RATE);

/** Roles that are partners (they earn through MedEasy and pay commission). */
const PARTNER_ROLES = ['doctor', 'pharmacy'];

module.exports = { PARTNER_AGREEMENT, commissionOn, PARTNER_ROLES };
