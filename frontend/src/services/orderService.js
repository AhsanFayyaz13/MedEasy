/**
 * orderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps all order-related API calls.
 * Uses the shared `api` Axios instance to call the backend.
 */

import api from './api';


// ─── Prescription Upload ──────────────────────────────────────────────────────
/**
 * Upload a prescription file.
 * @param {File}   file          Image or PDF file
 * @param {string} [notes]       Optional patient notes
 * @returns {Promise<{ prescriptionId: string }>}
 */
export async function uploadPrescription(file, notes = '') {

  const form = new FormData();
  form.append('prescription', file); // Multer expects 'prescription'

  const { data } = await api.post('/prescriptions/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return { prescriptionId: data._id };
}

// ─── Place Order ──────────────────────────────────────────────────────────────
/**
 * Submit a new order.
 * @param {{
 *   items:           Array<{ medicineId, name, price, quantity }>,
 *   shippingAddress: object,
 *   paymentMethod:   string,
 *   prescriptionId?: string,
 * }} payload
 * @returns {Promise<{ orderId: string, status: string, estimatedDelivery: string }>}
 */
export async function placeOrder(payload) {
  const { data } = await api.post('/orders', payload);
  return {
    orderId:           data._id,
    status:            data.status,
    estimatedDelivery: '2–3 business days',
  };
}

// ─── Fetch Orders ─────────────────────────────────────────────────────────────
/**
 * Fetch the current user's orders, optionally filtered by status.
 * @param {{ status?: string }} [filters]
 * @returns {Promise<Array>}
 */
export async function fetchOrders(filters = {}) {
  const params = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  const { data } = await api.get('/orders', { params });
  return data.map(order => ({
    ...order,
    id: order._id,
    deliveryFee: 0,
    items: order.items.map(i => ({
      medicineId: i.medicineId?._id || i.medicineId,
      name: i.medicineId?.name || 'Unknown Medicine',
      image: i.medicineId?.imageUrl || '💊',
      requiresPrescription: i.medicineId?.requiresPrescription,
      price: i.price,
      quantity: i.quantity
    }))
  }));
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
/**
 * Cancel an order by ID.
 * @param {string} orderId
 * @returns {Promise<{ success: boolean }>}
 */
export async function cancelOrder(orderId) {
  await api.delete(`/orders/${orderId}`);
  return { success: true };
}
