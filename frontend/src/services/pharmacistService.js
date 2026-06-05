/**
 * pharmacistService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All pharmacist-facing API calls.
 */
import api from './api';
import { mapPrescriptionToFrontend } from './prescriptionService';


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
  const { data } = await api.get('/medicines');
  const list = data.medicines ?? data.results ?? data;
  return Array.isArray(list) ? list.map(mapMedicineToFrontend) : [];
}

export async function createMedicine(payload) {
  const backendPayload = mapMedicineToBackend(payload);
  const { data } = await api.post('/medicines', backendPayload);
  return mapMedicineToFrontend(data);
}

export async function updateMedicine(id, payload) {
  const backendPayload = mapMedicineToBackend(payload);
  const { data } = await api.put(`/medicines/${id}`, backendPayload);
  return mapMedicineToFrontend(data);
}

export async function deleteMedicine(id) {
  await api.delete(`/medicines/${id}`);
  return { success: true };
}

export async function uploadMedicinePhoto(file) {
  const formData = new FormData();
  formData.append('medicinePhoto', file);
  const { data } = await api.post('/medicines/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
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
  const params = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  const { data } = await api.get('/orders/all', { params });
  const list = data.results ?? data;
  return Array.isArray(list) ? list.map(mapOrderToFrontend) : [];
}

export async function updateOrderStatus(id, newStatus) {
  const { data } = await api.put(`/orders/${id}/status`, { status: newStatus });
  return mapOrderToFrontend(data);
}

/* ─────────────────────────── PRESCRIPTIONS ───────────────────────────────── */

export async function fetchPendingPrescriptions() {
  const { data } = await api.get('/prescriptions/', { params: { status: 'pending' } });
  const list = data.results ?? data;
  return Array.isArray(list) ? list.map(mapPrescriptionToFrontend) : [];
}

/**
 * Verify or reject a prescription.
 * @param {string} id
 * @param {'verified'|'rejected'} status
 * @param {string} [rejectionReason]
 */
export async function verifyPrescription(id, status, rejectionReason = '') {
  const { data } = await api.put(`/prescriptions/${id}/verify/`, { status, rejection_reason: rejectionReason });
  return data;
}
