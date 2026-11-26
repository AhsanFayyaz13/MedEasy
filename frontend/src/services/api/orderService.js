/** Order API calls (patients and guests). */
import api from './client';

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
  if (notes) form.append('notes', notes);

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
    orderNumber:       data.orderNumber,
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
    orderNumber: order.orderNumber,
    deliveryFee: order.deliveryFee || 0,
    items: order.items.map(i => ({
      medicineId: i.medicineId?._id || i.medicineId,
      // Brand first, like the catalogue and cart ("Panadol", not "Paracetamol 500mg").
      name: i.medicineId?.brand || i.medicineId?.name || 'Unknown Medicine',
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
 * @param {string} [reason] shown to the pharmacy and on the order
 * @returns {Promise<{ success: boolean }>}
 */
export async function cancelOrder(orderId, reason) {
  await api.delete(`/orders/${orderId}`, { data: reason ? { reason } : {} });
  return { success: true };
}

// ─── Guest order tracking ─────────────────────────────────────────────────────
/** Look up a guest order with its order number and the phone used at checkout. */
export async function trackGuestOrder(orderNumber, phone) {
  const { data } = await api.post('/orders/track', { orderNumber: orderNumber.trim(), phone: phone.trim() });
  return data;
}

/** Cancel a guest order while it is still pending. */
export async function cancelGuestOrder(orderNumber, phone) {
  const { data } = await api.post('/orders/track/cancel', { orderNumber: orderNumber.trim(), phone: phone.trim() });
  return data;
}
