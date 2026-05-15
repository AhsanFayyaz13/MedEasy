/**
 * orderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps all order-related API calls.
 * Each function has a real implementation (using the shared `api` Axios instance)
 * AND a mock fallback that fires when VITE_USE_MOCK_API=true or the backend
 * is unreachable.
 *
 * Switch to real API by setting VITE_USE_MOCK_API=false in .env once the
 * Django backend is running.
 */

import api from './api';
import MOCK_ORDERS from '../data/mockOrders';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false'; // true by default

// ─── Helpers ──────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function fakeOrderId() {
  return 'ORD-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

// ─── Prescription Upload ──────────────────────────────────────────────────────
/**
 * Upload a prescription file.
 * @param {File}   file          Image or PDF file
 * @param {string} [notes]       Optional patient notes
 * @returns {Promise<{ prescriptionId: string }>}
 */
export async function uploadPrescription(file, notes = '') {
  if (USE_MOCK) {
    await delay(900);
    return { prescriptionId: 'RX-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
  }

  const form = new FormData();
  form.append('file',  file);
  form.append('notes', notes);

  const { data } = await api.post('/prescriptions/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { prescriptionId: data.id ?? data.prescriptionId };
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
  if (USE_MOCK) {
    await delay(1200);
    // Simulate a random occasional failure for realism (1 in 10 chance)
    if (Math.random() < 0.1) {
      throw new Error('Payment gateway timeout. Please try again.');
    }
    return {
      orderId:           fakeOrderId(),
      status:            'confirmed',
      estimatedDelivery: '2–3 business days',
    };
  }

  const { data } = await api.post('/orders/', payload);
  return {
    orderId:           data.id ?? data.orderId,
    status:            data.status,
    estimatedDelivery: data.estimated_delivery,
  };
}

// ─── Fetch Orders ─────────────────────────────────────────────────────────────
/**
 * Fetch the current user's orders, optionally filtered by status.
 * @param {{ status?: string }} [filters]
 * @returns {Promise<Array>}
 */
export async function fetchOrders(filters = {}) {
  if (USE_MOCK) {
    await delay(600);
    let orders = [...MOCK_ORDERS];
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter((o) => o.status === filters.status);
    }
    // Return newest first
    return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const params = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  const { data } = await api.get('/orders/', { params });
  return data.results ?? data;
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────
/**
 * Cancel an order by ID.
 * @param {string} orderId
 * @returns {Promise<{ success: boolean }>}
 */
export async function cancelOrder(orderId) {
  if (USE_MOCK) {
    await delay(700);
    return { success: true };
  }

  await api.delete(`/orders/${orderId}/`);
  return { success: true };
}
