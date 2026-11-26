const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');
const crypto = require('crypto');
const { commissionOn } = require('../config/partner');
const { normalizePhone } = require('../utils/phone');
const { sendEmail, escapeHtml } = require('../utils/mailer');

// Must match the checkout page (frontend/src/features/cart/components/checkoutShared.jsx).
const DELIVERY_FEE = 120;
const FREE_DELIVERY_FROM = 1000;
const deliveryFeeFor = (subtotal) => (subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE);

/** A guest may have at most this many orders in progress per phone number (fake-COD protection). */
const MAX_OPEN_GUEST_ORDERS = 3;
const OPEN_STATUSES = ['pending', 'confirmed', 'processing', 'dispatched'];

// No 0/O/1/I so numbers are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newOrderNumber = () => `ME-${Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')}`;

/** What a guest is allowed to see about their order. */
const publicOrder = (o) => ({
  orderNumber: o.orderNumber,
  status: o.status,
  cancellationReason: o.cancellationReason,
  createdAt: o.createdAt,
  items: o.items.map((i) => ({ name: i.medicineId?.brand || i.medicineId?.name || 'Medicine', quantity: i.quantity, price: i.price })),
  deliveryFee: o.deliveryFee,
  totalAmount: o.totalAmount,
  paymentMethod: o.paymentMethod,
  shippingAddress: { firstName: o.shippingAddress.firstName, city: o.shippingAddress.city },
});

async function findTrackedOrder({ orderNumber, phone }) {
  const order = await Order.findOne({ orderNumber, userId: { $exists: false } }).populate('items.medicineId', 'name brand');
  // Same message whether the number or the phone is wrong, so numbers can't be probed.
  if (!order || !order.guest?.phone || order.guest.phone !== normalizePhone(phone)) return null;
  return order;
}

async function restock(order) {
  await Promise.all(order.items.map((i) => Medicine.updateOne({ _id: i.medicineId?._id || i.medicineId }, { $inc: { stock: i.quantity } })));
}

// @desc    Place a new order
// @route   POST /api/orders
// @access  Patients, or guests for OTC medicines
exports.placeOrder = async (req, res) => {
  // Body is validated by validators.orders.place (ids, 1–100 qty, address fields).
  const { prescriptionId, paymentMethod, guestEmail } = req.body;
  // Delivery notes used to arrive top-level and were dropped; keep them with the address.
  const shippingAddress = { ...req.body.shippingAddress, notes: req.body.shippingAddress.notes || req.body.notes };
  const isGuest = !req.user;
  if (req.user && req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Only patient accounts can place orders' });
  }

  let guestPhone;
  if (isGuest) {
    guestPhone = normalizePhone(shippingAddress.phone);
    if (!guestPhone) return res.status(400).json({ message: 'Please enter a valid phone number' });
    if (paymentMethod !== 'cod') return res.status(400).json({ message: 'Guest orders are cash on delivery' });
    const open = await Order.countDocuments({ 'guest.phone': guestPhone, status: { $in: OPEN_STATUSES } });
    if (open >= MAX_OPEN_GUEST_ORDERS) {
      return res.status(429).json({ message: 'This phone number already has several orders on the way. Please sign in or contact us to order more.' });
    }
  }

  // Merge duplicate lines so stock checks are per medicine.
  const qtyById = new Map();
  for (const item of req.body.items) {
    qtyById.set(item.medicineId, (qtyById.get(item.medicineId) || 0) + item.quantity);
  }

  const medicines = await Medicine.find({ _id: { $in: [...qtyById.keys()] } });
  if (medicines.length !== qtyById.size) {
    return res.status(404).json({ message: 'One or more medicines were not found' });
  }

  const requiresPrescription = medicines.some((m) => m.requiresPrescription);
  if (requiresPrescription && isGuest) {
    return res.status(401).json({ message: 'Please sign in to order prescription medicines.', error: { code: 'LOGIN_REQUIRED' } });
  }
  if (requiresPrescription) {
    if (!prescriptionId) {
      return res.status(400).json({ message: 'Prescription required for one or more medicines' });
    }
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (prescription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Prescription does not belong to user' });
    }
    // A freshly uploaded (pending) prescription is fine — the pharmacy must verify it
    // before the order can be confirmed (enforced in updateOrderStatus).
    if (prescription.status === 'rejected') {
      return res.status(400).json({ message: 'This prescription was rejected. Please upload a valid prescription.' });
    }
  }

  // Reserve stock atomically: each decrement only succeeds if enough stock remains,
  // so concurrent orders can never oversell. Roll back on partial failure.
  const reserved = [];
  for (const med of medicines) {
    const qty = qtyById.get(med._id.toString());
    const updated = await Medicine.findOneAndUpdate(
      { _id: med._id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      await Promise.all(reserved.map((r) => Medicine.updateOne({ _id: r.id }, { $inc: { stock: r.qty } })));
      return res.status(400).json({ message: `Insufficient stock for ${med.name}` });
    }
    reserved.push({ id: med._id, qty });
  }

  // Prices always come from the database, never the client.
  const items = medicines.map((m) => ({ medicineId: m._id, quantity: qtyById.get(m._id.toString()), price: m.price }));
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryFeeFor(subtotal);
  const commission = commissionOn(subtotal); // Partner Agreement: 10% of the medicines, not the delivery fee
  const totalAmount = subtotal + deliveryFee;

  try {
    const createdOrder = await Order.create({
      ...(isGuest
        ? { guest: { name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(), phone: guestPhone, email: guestEmail } }
        : { userId: req.user._id }),
      orderNumber: newOrderNumber(),
      items,
      prescriptionId: requiresPrescription ? prescriptionId : undefined,
      deliveryFee,
      commission,
      totalAmount,
      shippingAddress,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
    });
    if (isGuest && guestEmail) {
      const lines = medicines.map((m) => `<li>${escapeHtml(m.name)} × ${qtyById.get(m._id.toString())}</li>`).join('');
      sendEmail({
        to: guestEmail,
        subject: `MedEasy order ${createdOrder.orderNumber} received`,
        title: `Order ${createdOrder.orderNumber} received`,
        bodyHtml: `<p>Thanks, ${escapeHtml(shippingAddress.firstName)}. We’ve received your order and a pharmacist will confirm it shortly.</p><ul>${lines}</ul><p><strong>Total (cash on delivery): Rs. ${totalAmount.toLocaleString('en-PK')}</strong></p><p>Track it any time at ${escapeHtml(process.env.FRONTEND_ORIGIN || 'https://medeasy.systems')}/track with your order number and phone.</p>`,
      }).catch((err) => console.error('Guest order email failed:', err.message));
    }
    res.status(201).json(createdOrder);
  } catch (error) {
    await Promise.all(reserved.map((r) => Medicine.updateOne({ _id: r.id }, { $inc: { stock: r.qty } })));
    throw error;
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate('items.medicineId', 'name brand imageUrl requiresPrescription')
    .sort({ createdAt: -1 });
  res.json(orders);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('items.medicineId', 'name brand imageUrl')
    .populate('prescriptionId');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check if user owns the order, or is an admin/pharmacist
  if (
    String(order.userId?._id || '') !== req.user._id.toString() &&
    req.user.role !== 'admin' &&
    req.user.role !== 'pharmacist' &&
    req.user.role !== 'pharmacy'
  ) {
    return res.status(403).json({ message: 'Not authorized to view this order' });
  }

  res.json(order);
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Pharmacist/Admin)
exports.updateOrderStatus = async (req, res) => {
  const { status, reason } = req.body; // status validated against the enum
  const order = await Order.findById(req.params.id).populate('prescriptionId', 'status');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.status === 'cancelled' && status !== 'cancelled') {
    return res.status(400).json({ message: 'Cancelled orders cannot be reopened. Ask the patient to place a new order.' });
  }
  if (['confirmed', 'processing', 'dispatched', 'delivered'].includes(status) && order.prescriptionId && order.prescriptionId.status !== 'verified') {
    return res.status(400).json({ message: 'Verify the attached prescription before confirming this order.' });
  }

  if (status === 'cancelled') {
    // Flip atomically so stock is restored exactly once, even if staff and patient cancel together.
    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled', ...(reason ? { cancellationReason: reason } : {}) } },
      { returnDocument: 'after' }
    );
    if (cancelled) {
      await Promise.all(order.items.map((i) => Medicine.updateOne({ _id: i.medicineId }, { $inc: { stock: i.quantity } })));
      return res.json(cancelled);
    }
    return res.json(await Order.findById(order._id));
  }

  order.status = status;
  const updatedOrder = await order.save();
  res.json(updatedOrder);
};

// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
exports.cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check authorization
  if (
    String(order.userId || '') !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ message: 'Not authorized to cancel this order' });
  }

  // Only allow if pending or confirmed
  if (order.status !== 'pending' && order.status !== 'confirmed') {
    return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
  }

  // Flip status first (atomically) so a double-cancel can't restock twice.
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ['pending', 'confirmed'] } },
    { $set: { status: 'cancelled', ...(req.body?.reason ? { cancellationReason: req.body.reason } : {}) } },
    { returnDocument: 'after' }
  );
  if (!cancelled) {
    return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
  }
  await Promise.all(order.items.map((item) => Medicine.updateOne({ _id: item.medicineId }, { $inc: { stock: item.quantity } })));
  Object.assign(order, cancelled.toObject());

  res.json({ message: 'Order cancelled and stock restored', order });
};

// @desc    Admin/Pharmacist: get all orders (with optional status filter)
// @route   GET /api/orders/all
// @access  Private (pharmacist/admin)
exports.getAllOrders = async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const orders = await Order.find(filter)
    .populate('userId', 'name email')
    .populate('items.medicineId', 'name brand imageUrl requiresPrescription')
    .populate('prescriptionId')
    .sort({ createdAt: -1 });
  res.json(orders);
};

// @desc    Guest order look-up (order number + phone used at checkout)
// @route   POST /api/orders/track
// @access  Public (rate limited)
exports.trackOrder = async (req, res) => {
  const order = await findTrackedOrder(req.body);
  if (!order) return res.status(404).json({ message: 'We couldn’t find an order with that number and phone.' });
  res.json(publicOrder(order));
};

// @desc    Guest cancels their own order while it is still pending
// @route   POST /api/orders/track/cancel
// @access  Public (rate limited)
exports.cancelTrackedOrder = async (req, res) => {
  const order = await findTrackedOrder(req.body);
  if (!order) return res.status(404).json({ message: 'We couldn’t find an order with that number and phone.' });
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, status: 'pending' },
    { $set: { status: 'cancelled', cancellationReason: 'Cancelled by the customer' } },
    { returnDocument: 'after' }
  ).populate('items.medicineId', 'name brand');
  if (!cancelled) return res.status(400).json({ message: 'This order is already being prepared. Please contact us to cancel it.' });
  await restock(order);
  res.json(publicOrder(cancelled));
};
