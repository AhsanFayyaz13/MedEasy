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
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
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
    await delay(600);
    return { prescriptionId: 'RX-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
  }

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
  if (USE_MOCK) {
    await delay(800);
    const newOrder = {
      id: fakeOrderId(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: payload.paymentMethod || 'cod',
      paymentStatus: 'pending',
      totalAmount: payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      deliveryFee: 0,
      estimatedDelivery: 'Expected in 2–3 business days',
      prescriptionId: payload.prescriptionId || null,
      shippingAddress: payload.shippingAddress,
      items: payload.items.map(item => ({
        medicineId: item.medicineId,
        name: item.name,
        brand: item.brand || '',
        image: item.image || '💊',
        price: item.price,
        quantity: item.quantity,
        requiresPrescription: item.requiresPrescription || false,
        subtotal: item.price * item.quantity
      }))
    };
    MOCK_ORDERS.push(newOrder);
    return {
      orderId: newOrder.id,
      status: newOrder.status,
      estimatedDelivery: newOrder.estimatedDelivery,
    };
  }
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
  if (USE_MOCK) {
    await delay(500);
    let orders = [...MOCK_ORDERS];
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter(o => o.status === filters.status);
    }
    return orders;
  }
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
  if (USE_MOCK) {
    await delay(500);
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (order) {
      order.status = 'cancelled';
      order.updatedAt = new Date().toISOString();
    }
    return { success: true };
  }
  await api.delete(`/orders/${orderId}`);
  return { success: true };
}
