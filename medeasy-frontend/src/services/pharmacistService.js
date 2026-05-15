/**
 * pharmacistService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All pharmacist-facing API calls with mock fallbacks.
 * Controls: VITE_USE_MOCK_API !== 'false'
 */
import api from './api';
import MOCK_MEDICINES from '../data/mockMedicines';
import MOCK_ORDERS    from '../data/mockOrders';
import MOCK_PRESCRIPTIONS from '../data/mockPrescriptions';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
const delay    = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─────────────────────────── MEDICINES ───────────────────────────────────── */

export async function fetchAllMedicines() {
  if (USE_MOCK) { await delay(400); return [...MOCK_MEDICINES]; }
  const { data } = await api.get('/medicines/');
  return data.results ?? data;
}

export async function createMedicine(payload) {
  if (USE_MOCK) {
    await delay(600);
    const newMed = {
      ...payload,
      id: Math.max(...MOCK_MEDICINES.map((m) => m.id)) + 1,
      rating: 0, reviews_count: 0,
      discount_pct: payload.original_price && payload.price
        ? Math.round(((payload.original_price - payload.price) / payload.original_price) * 100)
        : 0,
    };
    MOCK_MEDICINES.push(newMed);
    return newMed;
  }
  const { data } = await api.post('/medicines/', payload);
  return data;
}

export async function updateMedicine(id, payload) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_MEDICINES.findIndex((m) => m.id === id);
    if (idx !== -1) {
      MOCK_MEDICINES[idx] = {
        ...MOCK_MEDICINES[idx],
        ...payload,
        discount_pct: payload.original_price && payload.price
          ? Math.round(((payload.original_price - payload.price) / payload.original_price) * 100)
          : MOCK_MEDICINES[idx].discount_pct,
      };
      return MOCK_MEDICINES[idx];
    }
    throw new Error('Medicine not found');
  }
  const { data } = await api.put(`/medicines/${id}/`, payload);
  return data;
}

export async function deleteMedicine(id) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_MEDICINES.findIndex((m) => m.id === id);
    if (idx !== -1) MOCK_MEDICINES.splice(idx, 1);
    return { success: true };
  }
  await api.delete(`/medicines/${id}/`);
  return { success: true };
}

/* ─────────────────────────── ORDERS ──────────────────────────────────────── */

/** Allowed status transitions (pharmacist-level) */
export const NEXT_STATUSES = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['dispatched', 'cancelled'],
  dispatched: ['delivered'],
  delivered:  [],
  cancelled:  [],
};

export async function fetchAllOrders(filters = {}) {
  if (USE_MOCK) {
    await delay(500);
    let orders = [...MOCK_ORDERS];
    if (filters.status && filters.status !== 'all')
      orders = orders.filter((o) => o.status === filters.status);
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  const params = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  const { data } = await api.get('/orders/', { params });
  return data.results ?? data;
}

export async function updateOrderStatus(id, newStatus) {
  if (USE_MOCK) {
    await delay(500);
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (order) { order.status = newStatus; order.updatedAt = new Date().toISOString(); }
    return order;
  }
  const { data } = await api.put(`/orders/${id}/status/`, { status: newStatus });
  return data;
}

/* ─────────────────────────── PRESCRIPTIONS ───────────────────────────────── */

export async function fetchPendingPrescriptions() {
  if (USE_MOCK) {
    await delay(400);
    return MOCK_PRESCRIPTIONS
      .filter((p) => p.status === 'pending')
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }
  const { data } = await api.get('/prescriptions/', { params: { status: 'pending' } });
  return data.results ?? data;
}

/**
 * Verify or reject a prescription.
 * @param {string} id
 * @param {'verified'|'rejected'} status
 * @param {string} [rejectionReason]
 */
export async function verifyPrescription(id, status, rejectionReason = '') {
  if (USE_MOCK) {
    await delay(700);
    const rx = MOCK_PRESCRIPTIONS.find((p) => p.id === id);
    if (rx) {
      rx.status          = status;
      rx.reviewedAt      = new Date().toISOString();
      rx.reviewedBy      = 'Dr. Farhan Qureshi (PharmD)'; // current mock pharmacist
      rx.rejectionReason = status === 'rejected' ? rejectionReason : null;
    }
    return rx;
  }
  const { data } = await api.put(`/prescriptions/${id}/verify/`, { status, rejection_reason: rejectionReason });
  return data;
}
