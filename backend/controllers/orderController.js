const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
exports.placeOrder = async (req, res) => {
  try {
    const { items, prescriptionId, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    let totalAmount = 0;
    let requiresPrescription = false;

    // Validate items and calculate total, check stock
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);
      if (!medicine) {
        return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
      }
      
      if (medicine.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
      }

      if (medicine.requiresPrescription) {
        requiresPrescription = true;
      }

      totalAmount += medicine.price * item.quantity;
      
      // Update item price to match current DB price
      item.price = medicine.price;
    }

    // Check prescription if required
    if (requiresPrescription) {
      if (!prescriptionId) {
        return res.status(400).json({ message: 'Prescription required for one or more medicines' });
      }

      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({ message: 'Prescription not found' });
      }

      if (prescription.userId.toString() !== req.user._id.toString()) {
         return res.status(403).json({ message: 'Prescription does not belong to user' });
      }

      if (prescription.status !== 'verified') {
        return res.status(400).json({ message: 'Prescription is not verified yet' });
      }
    }

    // Deduct stock
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicineId);
      medicine.stock -= item.quantity;
      await medicine.save();
    }

    const order = new Order({
      userId: req.user._id,
      items,
      prescriptionId: requiresPrescription ? prescriptionId : undefined,
      totalAmount,
      shippingAddress,
      status: 'pending',
      paymentStatus: 'pending'
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.medicineId', 'name imageUrl requiresPrescription')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Pharmacist/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure status is valid
    const validStatuses = ['pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    order.status = status;
    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
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

    // Restock items
    for (const item of order.items) {
      const medicine = await Medicine.findById(item.medicineId);
      if (medicine) {
        medicine.stock += item.quantity;
        await medicine.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ message: 'Order cancelled and stock restored', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin/Pharmacist: get all orders (with optional status filter)
// @route   GET /api/orders/all
// @access  Private (pharmacist/admin)
exports.getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .populate('items.medicineId', 'name imageUrl requiresPrescription')
      .populate('prescriptionId')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
