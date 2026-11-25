const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
exports.placeOrder = async (req, res) => {
  // Body is validated by validators.orders.place (ids, 1–100 qty, address fields).
  const { prescriptionId, shippingAddress, paymentMethod } = req.body;

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
  if (requiresPrescription) {
    if (!prescriptionId) {
      return res.status(400).json({ message: 'Prescription required for one or more medicines' });
    }
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (prescription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Prescription does not belong to user' });
    }
    if (prescription.status !== 'verified') {
      return res.status(400).json({ message: 'Prescription is not verified yet' });
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
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  try {
    const createdOrder = await Order.create({
      userId: req.user._id,
      items,
      prescriptionId: requiresPrescription ? prescriptionId : undefined,
      totalAmount,
      shippingAddress,
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending',
    });
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
    .populate('items.medicineId', 'name imageUrl requiresPrescription')
    .sort({ createdAt: -1 });
  res.json(orders);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('items.medicineId', 'name imageUrl')
    .populate('prescriptionId');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Check if user owns the order, or is an admin/pharmacist
  if (
    order.userId._id.toString() !== req.user._id.toString() &&
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
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // status is validated against the enum by validators.orders.status

  order.status = status;
  if (status === 'cancelled' && req.body.reason) order.cancellationReason = req.body.reason;
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
    order.userId.toString() !== req.user._id.toString() &&
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
    { $set: { status: 'cancelled' } },
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
    .populate('items.medicineId', 'name imageUrl requiresPrescription')
    .populate('prescriptionId')
    .sort({ createdAt: -1 });
  res.json(orders);
};
