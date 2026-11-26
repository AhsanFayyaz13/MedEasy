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

module.exports = { STATUS_TEXT, orderRef, notifyOrderStatus };
