const crypto = require('crypto');
const Medicine = require('../models/Medicine');
const { notify } = require('./notify');

/** What the patient is told when their order moves on. */
const STATUS_TEXT = {
  confirmed: 'has been confirmed by the pharmacy',
  processing: 'is being prepared',
  dispatched: 'is on its way',
  delivered: 'has been delivered',
};

/** How an order is named to people: its order number (older orders: a short id). */
const orderRef = (order) => order.orderNumber || `#${String(order._id).slice(-8).toUpperCase()}`;

/** Tell a signed-in patient their order reached `status` (fire-and-forget). */
function notifyOrderStatus(order, status) {
  if (!order.userId || !STATUS_TEXT[status]) return undefined;
  return notify(order.userId, { type: 'order', text: `Order ${orderRef(order)} ${STATUS_TEXT[status]}.`, link: `/orders/${order._id}` });
}

// Must match the checkout page (frontend/src/features/cart/components/checkoutShared.jsx).
const DELIVERY_FEE = 120;
const FREE_DELIVERY_FROM = 1000;
const deliveryFeeFor = (subtotal) => (subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE);

// No 0/O/1/I so numbers are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newOrderNumber = () => `ME-${Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')}`;

/** Give reserved stock back (after a failed or cancelled order). */
function releaseStock(reserved) {
  return Promise.all(reserved.map((r) => Medicine.updateOne({ _id: r.id }, { $inc: { stock: r.qty } })));
}

/**
 * Reserve stock atomically: each decrement only succeeds if enough stock remains, so concurrent
 * orders can never oversell. On a shortage everything reserved so far is released and the
 * medicine that ran short is returned as `short`.
 * @param {Array<{ _id, name }>} medicines
 * @param {Map<string, number>} qtyById
 */
async function reserveStock(medicines, qtyById) {
  const reserved = [];
  for (const med of medicines) {
    const qty = qtyById.get(String(med._id));
    const updated = await Medicine.findOneAndUpdate(
      { _id: med._id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      await releaseStock(reserved);
      return { short: med };
    }
    reserved.push({ id: med._id, qty });
  }
  return { reserved };
}

module.exports = { STATUS_TEXT, orderRef, notifyOrderStatus, DELIVERY_FEE, deliveryFeeFor, newOrderNumber, reserveStock, releaseStock };
