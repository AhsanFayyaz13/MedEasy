/* Shared constants & helpers (extracted from OrderTracking.jsx) */
import { FaCheckCircle, FaBox, FaTruck, FaHome, FaTimesCircle, FaReceipt } from 'react-icons/fa';

export const STATUS_CONFIG = {
  pending:   { label: 'Pending',    color: 'warning',  text: 'dark', icon: <FaReceipt />,     step: 0 },
  confirmed: { label: 'Confirmed',  color: 'primary',  text: null,   icon: <FaCheckCircle />, step: 1 },
  dispatched:{ label: 'Dispatched', color: 'info',     text: null,   icon: <FaTruck />,       step: 2 },
  delivered: { label: 'Delivered',  color: 'success',  text: null,   icon: <FaHome />,        step: 3 },
  cancelled: { label: 'Cancelled',  color: 'danger',   text: null,   icon: <FaTimesCircle />, step: -1 },
};


export const STEPS = [
  { key: 'pending',    label: 'Order Placed',     icon: <FaCheckCircle />,  desc: 'We received your order and are verifying payment.'    },
  { key: 'confirmed',  label: 'Confirmed',         icon: <FaBox />,          desc: 'Your order has been confirmed and is being packed.'   },
  { key: 'dispatched', label: 'Out for Delivery',  icon: <FaTruck />,        desc: 'Your package is on its way to your address.'          },
  { key: 'delivered',  label: 'Delivered',         icon: <FaHome />,         desc: 'Your order was delivered. Enjoy your medicines!'      },
];


export const PAYMENT_LABELS = { cod: 'Cash on Delivery', jazz: 'JazzCash', easy: 'EasyPaisa', card: 'Credit/Debit Card' };

export const STATUS_TABS = [
  { key: 'all',        label: 'All Orders' },
  { key: 'pending',    label: 'Pending'    },
  { key: 'confirmed',  label: 'Confirmed'  },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'delivered',  label: 'Delivered'  },
  { key: 'cancelled',  label: 'Cancelled'  },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(iso);
  }
}

export function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? String(iso) : d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}
