/* Shared constants & helpers (extracted from PharmacistDashboard.jsx) */
import { API_ORIGIN } from '../../../lib/env';

export const serverUrl = API_ORIGIN;

export const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return String(iso);
  }
};

// One wording for payment methods across the site.
export { PAYMENT_LABELS } from '../../orders/lib/orderStatus';

export const EMPTY_MED = {
  name:'', brand:'', category:'', price:'', original_price:'',
  stock:'', requires_prescription: false, description:'', image:'💊',
  manufacturer:'', expiryDate:'',
};
