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

export const fmtBytes = (b) => b < 1024 * 1024
  ? `${(b / 1024).toFixed(0)} KB`
  : `${(b / (1024 * 1024)).toFixed(1)} MB`;

export const ORDER_STATUS_CFG = {
  pending:   { color: 'warning', text: 'dark' },
  confirmed: { color: 'primary', text: null },
  dispatched:{ color: 'info',    text: null },
  delivered: { color: 'success', text: null },
  cancelled: { color: 'danger',  text: null },
};


export const PAYMENT_LABELS = { cod:'Cash on Delivery', jazz:'JazzCash', easy:'EasyPaisa', card:'Card' };

export const EMPTY_MED = {
  name:'', brand:'', category:'', price:'', original_price:'',
  stock:'', requires_prescription: false, description:'', image:'💊',
};
