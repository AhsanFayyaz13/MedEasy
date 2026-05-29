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

/* ─── Mapping Utilities ─────────────────────────────────────────────────── */
function mapMedicineToFrontend(m) {
  if (!m) return null;
  const price = Number(m.price);
  const origPrice = Number(m.originalPrice || m.original_price || m.price);
  return {
    ...m,
    id: m._id || m.id,
    price,
    original_price: origPrice,
    discount_pct: origPrice && price ? Math.round(((origPrice - price) / origPrice) * 100) : 0,
    requires_prescription: m.requiresPrescription !== undefined ? m.requiresPrescription : (m.requires_prescription || false),
    image: m.imageUrl || m.image || '💊',
  };
}

function mapMedicineToBackend(payload) {
  return {
    name: payload.name,
    brand: payload.brand,
    description: payload.description || '',
    category: payload.category,
    price: Number(payload.price),
    originalPrice: Number(payload.original_price) || Number(payload.price),
    stock: Number(payload.stock),
    requiresPrescription: payload.requires_prescription || false,
    imageUrl: payload.image || '💊',
  };
}

/* ─────────────────────────── MEDICINES ───────────────────────────────────── */

export async function fetchAllMedicines() {
  if (USE_MOCK) { await delay(400); return [...MOCK_MEDICINES]; }
  const { data } = await api.get('/medicines');
  const list = data.medicines ?? data.results ?? data;
  return Array.isArray(list) ? list.map(mapMedicineToFrontend) : [];
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
  const backendPayload = mapMedicineToBackend(payload);
  const { data } = await api.post('/medicines', backendPayload);
  return mapMedicineToFrontend(data);
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
  const backendPayload = mapMedicineToBackend(payload);
  const { data } = await api.put(`/medicines/${id}`, backendPayload);
  return mapMedicineToFrontend(data);
}

export async function deleteMedicine(id) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_MEDICINES.findIndex((m) => m.id === id);
    if (idx !== -1) MOCK_MEDICINES.splice(idx, 1);
    return { success: true };
  }
  await api.delete(`/medicines/${id}`);
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

function mapOrderToFrontend(o) {
  if (!o) return null;
  return {
    ...o,
    id: o._id || o.id,
    patientName: o.userId?.name || o.patientName || 'Patient User',
    patientEmail: o.userId?.email || o.patientEmail || '',
    patientPhone: o.userId?.phone || o.patientPhone || '',
    userId: o.userId?._id || o.userId
  };
}

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
  const { data } = await api.get('/orders/all', { params });
  const list = data.results ?? data;
  return Array.isArray(list) ? list.map(mapOrderToFrontend) : [];
}

export async function updateOrderStatus(id, newStatus) {
  if (USE_MOCK) {
    await delay(500);
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (order) { order.status = newStatus; order.updatedAt = new Date().toISOString(); }
    return order;
  }
  const { data } = await api.put(`/orders/${id}/status`, { status: newStatus });
  return mapOrderToFrontend(data);
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
