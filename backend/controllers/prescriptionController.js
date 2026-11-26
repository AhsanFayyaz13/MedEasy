const Prescription = require('../models/Prescription');
const Order = require('../models/Order');
const Medicine = require('../models/Medicine');
const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { commissionOn } = require('../config/partner');
const { notify, notifyStaff, notifyChat, markChatRead } = require('../utils/notify');
const { notifyOrderStatus, deliveryFeeFor, newOrderNumber, reserveStock, releaseStock } = require('../utils/orders');

const { expiresAt, unusableReason, offerState, OFFER_HOURS } = Prescription;
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
const patientLink = (rx) => `/prescriptions/upload?rx=${rx._id}`;
const rxRef = (rx) => `#RX-${String(rx._id).slice(-6).toUpperCase()}`;
const STAFF = ['pharmacist', 'pharmacy', 'admin'];

/** Orders (not cancelled) that use each prescription, keyed by prescription id. */
async function ordersByPrescription(ids) {
  const orders = await Order.find({ prescriptionId: { $in: ids }, status: { $ne: 'cancelled' } })
    .select('orderNumber status prescriptionId createdAt')
    .sort({ createdAt: 1 })
    .lean();
  const map = new Map();
  for (const o of orders) {
    const key = String(o.prescriptionId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ id: o._id, orderNumber: o.orderNumber, status: o.status });
  }
  return map;
}

/** A prescription plus when it expires, the orders using it and whether it can be used for a new order. */
function withUsage(rx, orders = []) {
  const plain = typeof rx.toObject === 'function' ? rx.toObject() : rx;
  const problem = unusableReason(plain, orders.length);
  return {
    ...plain,
    expiresAt: expiresAt(plain),
    orders,
    usable: !problem,
    unusableReason: problem || undefined,
    offerState: offerState(plain, orders.length) || undefined,
  };
}

async function describe(list) {
  const usage = await ordersByPrescription(list.map((rx) => rx._id));
  return list.map((rx) => withUsage(rx, usage.get(String(rx._id))));
}

// @desc    Upload prescription
// @route   POST /api/prescriptions/upload
// @access  Private (Patient)
exports.uploadPrescription = async (req, res) => {
  try {
    let fileUrl = '';

    if (req.body.fileUrl) {
      if (!/^https:\/\//i.test(req.body.fileUrl)) {
        return res.status(400).json({ message: 'Prescription URL must use https' });
      }
      fileUrl = req.body.fileUrl;
    } else if (req.file) {
      // Upload to Cloudinary
      fileUrl = await uploadToCloudinary(req.file.path, {
        folder: `${process.env.CLOUDINARY_FOLDER || 'Medeasy Uploads'}/prescriptions`
      });
    } else {
      return res.status(400).json({ message: 'No file uploaded or URL provided' });
    }

    const prescription = await Prescription.create({
      userId: req.user._id,
      fileUrl,
      notes: req.body.notes || undefined,
      status: 'pending'
    });

    res.status(201).json(withUsage(prescription));
    notifyStaff('prescriptions', { type: 'prescription', text: `New prescription ${rxRef(prescription)} from ${req.user.name || 'a patient'} is waiting for review.` });
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch { /* already removed */ }
    }
    throw error;
  }
};

// @desc    Patients: their own prescriptions, with expiry and the orders using them.
//          Staff: the review queue (oldest first), or with ?view=reviewed the latest decisions.
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
  if (STAFF.includes(req.user.role)) {
    // Staff need contact and delivery details to fulfil the prescription.
    let query;
    if (req.query.view === 'reviewed') {
      query = Prescription.find({ status: { $ne: 'pending' } }).sort({ reviewedAt: -1 }).limit(100).populate('reviewedBy', 'name');
    } else if (req.query.view === 'offers') {
      // Offers waiting on the patient, or turned down (the patient may still reply), newest first.
      query = Prescription.find({ 'offer.status': { $in: ['open', 'declined'] } }).sort({ 'offer.sentAt': -1 }).limit(100).populate('reviewedBy', 'name');
    } else {
      query = Prescription.find({ status: 'pending' }).sort({ createdAt: 1 });
    }
    const list = await query.populate('userId', 'name email phone address');
    return res.json(await describe(list));
  }
  const list = await Prescription.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.json(await describe(list));
};

// @desc    Approve or decline a prescription. With confirmOrders, approving also confirms the
//          pending orders it is attached to, so the pharmacist doesn't have to do it twice.
// @route   PUT /api/prescriptions/:id/verify
// @access  Private (Pharmacist)
exports.verifyPrescription = async (req, res) => {
  const { status, doctorId, rejectionReason, refillable, confirmOrders } = req.body;
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw new AppError(404, 'Prescription not found');
  // Decisions are final, so two pharmacists can't overwrite each other and the history stays true.
  if (prescription.status !== 'pending') throw new AppError(409, 'This prescription has already been reviewed.', 'ALREADY_REVIEWED');

  prescription.status = status; // validated enum
  prescription.rejectionReason = status === 'rejected' ? rejectionReason || undefined : undefined;
  prescription.refillable = status === 'verified' && Boolean(refillable);
  prescription.reviewedBy = req.user._id;
  prescription.reviewedAt = new Date();
  if (doctorId) prescription.doctorId = doctorId;
  await prescription.save();

  const confirmed = [];
  if (status === 'verified' && confirmOrders) {
    const pending = await Order.find({ prescriptionId: prescription._id, status: 'pending' });
    for (const order of pending) {
      // Only flip orders that are still pending at this moment (the patient may cancel meanwhile).
      const updated = await Order.findOneAndUpdate({ _id: order._id, status: 'pending' }, { $set: { status: 'confirmed' } }, { returnDocument: 'after' });
      if (updated) confirmed.push(updated);
    }
  }

  const [described] = await describe([prescription]);
  res.json({ ...described, confirmedOrders: confirmed.map((o) => ({ id: o._id, orderNumber: o.orderNumber, status: o.status })) });

  notify(prescription.userId, {
    type: status === 'verified' ? 'prescription' : 'cancel',
    text: status === 'verified'
      ? `Prescription ${rxRef(prescription)} was approved.${confirmed.length ? '' : ' You can now use it at checkout.'}`
      : `Prescription ${rxRef(prescription)} was declined.${prescription.rejectionReason ? ` Reason: ${prescription.rejectionReason}` : ''}`,
    link: '/prescriptions/upload',
  });
  confirmed.forEach((order) => notifyOrderStatus(order, 'confirmed'));
};

// @desc    Delete a pending prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Patient/Owner)
exports.deletePrescription = async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);

  if (!prescription) {
    return res.status(404).json({ message: 'Prescription not found' });
  }

  // Ensure the user owns the prescription
  if (prescription.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to delete this prescription' });
  }

  // Only allow deleting pending prescriptions that no order relies on
  if (prescription.status !== 'pending') {
    return res.status(400).json({ message: 'Only pending prescriptions can be deleted' });
  }
  if (await Order.exists({ prescriptionId: prescription._id, status: { $ne: 'cancelled' } })) {
    return res.status(400).json({ message: 'This prescription is attached to an order. Cancel the order first if you want to remove it.' });
  }

  await prescription.deleteOne();
  res.json({ message: 'Prescription removed successfully' });
};

/* ─── Pharmacy offers ─────────────────────────────────────────────────────── */

/** The prescription a staff member is working on, checked it can still be supplied. */
async function loadForOffer(id) {
  const rx = await Prescription.findById(id);
  if (!rx) throw new AppError(404, 'Prescription not found');
  if (rx.status === 'rejected') throw new AppError(409, 'This prescription was declined.', 'ALREADY_REVIEWED');
  if (rx.offer?.status === 'accepted') throw new AppError(409, 'The patient already accepted an offer for this prescription.', 'OFFER_ACCEPTED');
  if (expiresAt(rx) < new Date()) throw new AppError(400, 'This prescription has expired.', 'PRESCRIPTION_UNUSABLE');
  if (await Order.exists({ prescriptionId: rx._id, status: { $ne: 'cancelled' } })) {
    throw new AppError(409, 'An order already uses this prescription. Confirm or cancel that order instead.', 'PRESCRIPTION_USED');
  }
  return rx;
}

// @desc    Send (or revise) the pharmacy's offer: the medicines it can supply from this prescription,
//          at what quantity and price, what it can't supply, and a note. Approves the prescription.
// @route   PUT /api/prescriptions/:id/offer
// @access  Private (Pharmacist)
exports.sendOffer = async (req, res) => {
  const rx = await loadForOffer(req.params.id);
  const { items, unavailable, message, refillable } = req.body;

  const medicines = await Medicine.find({ _id: { $in: items.map((i) => i.medicineId) } });
  const byId = new Map(medicines.map((m) => [String(m._id), m]));
  const lines = items.map((i) => {
    const med = byId.get(i.medicineId);
    if (!med) throw new AppError(404, 'One of the medicines is no longer in the catalogue.');
    if (med.stock < i.quantity) throw new AppError(400, `Only ${med.stock} of ${med.name} in stock. Lower the quantity and say so in its note.`, 'INSUFFICIENT_STOCK');
    return {
      medicineId: med._id,
      name: med.brand && med.brand !== med.name ? `${med.name} (${med.brand})` : med.name,
      quantity: i.quantity,
      price: med.price,
      note: i.note || undefined,
      substituteFor: i.substituteFor || undefined,
    };
  });

  const now = new Date();
  const revised = Boolean(rx.offer?.sentAt);
  if (rx.status === 'pending') {
    rx.status = 'verified';
    rx.reviewedBy = req.user._id;
    rx.reviewedAt = now;
  }
  if (refillable !== undefined) rx.refillable = Boolean(refillable);
  rx.offer = {
    items: lines,
    unavailable,
    message: message || undefined,
    status: 'open',
    version: (rx.offer?.version || 0) + 1,
    sentBy: req.user._id,
    sentAt: now,
    expiresAt: new Date(now.getTime() + OFFER_HOURS * 3600 * 1000),
  };
  await rx.save();

  const [described] = await describe([rx]);
  res.json(described);

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const missing = unavailable.length ? `, ${unavailable.length} not available` : '';
  notify(rx.userId, {
    type: 'prescription',
    text: `${revised ? 'The pharmacy updated its offer' : 'The pharmacy prepared your medicines'} for ${rxRef(rx)}: ${lines.length} item${lines.length > 1 ? 's' : ''}, ${rs(total)}${missing}. Please reply within ${OFFER_HOURS} hours.`,
    link: patientLink(rx),
  });
};

/** The patient's own prescription. */
async function loadOwn(req) {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) throw new AppError(404, 'Prescription not found');
  if (String(rx.userId) !== String(req.user._id)) throw new AppError(403, 'Not authorized to use this prescription');
  return rx;
}

// @desc    Accept the pharmacy's offer: the chosen lines become a confirmed order at the offered prices.
// @route   POST /api/prescriptions/:id/offer/accept
// @access  Private (Patient, owner)
exports.acceptOffer = async (req, res) => {
  const rx = await loadOwn(req);
  const { version, items: chosen, shippingAddress, paymentMethod } = req.body;
  const used = await Order.countDocuments({ prescriptionId: rx._id, status: { $ne: 'cancelled' } });
  const state = offerState(rx, used);
  if (state === 'expired') throw new AppError(400, `This offer has expired (offers last ${OFFER_HOURS} hours). Message the pharmacy to ask for a new one.`, 'OFFER_EXPIRED');
  if (state !== 'open') throw new AppError(409, 'This offer is no longer open.', 'OFFER_CLOSED');
  if (rx.offer.version !== version) throw new AppError(409, 'The pharmacy has just updated this offer. Please review it again.', 'OFFER_CHANGED');
  const problem = unusableReason(rx, used);
  if (problem) throw new AppError(400, problem, 'PRESCRIPTION_UNUSABLE');

  const wanted = new Set(chosen);
  const lines = rx.offer.items.filter((l) => wanted.has(String(l.medicineId)));
  if (lines.length !== wanted.size) throw new AppError(400, 'Choose medicines from the offer.');

  const medicines = await Medicine.find({ _id: { $in: lines.map((l) => l.medicineId) } });
  if (medicines.length !== lines.length) throw new AppError(404, 'One of the medicines is no longer in the catalogue. Message the pharmacy.');
  const qtyById = new Map(lines.map((l) => [String(l.medicineId), l.quantity]));
  const { reserved, short } = await reserveStock(medicines, qtyById);
  if (short) throw new AppError(400, `${short.name} has just run out. Message the pharmacy to update the offer.`, 'INSUFFICIENT_STOCK');

  // Offered prices are honoured until the offer expires.
  const items = lines.map((l) => ({ medicineId: l.medicineId, quantity: l.quantity, price: l.price }));
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryFeeFor(subtotal);
  let order;
  try {
    order = await Order.create({
      userId: req.user._id,
      orderNumber: newOrderNumber(),
      items,
      prescriptionId: rx._id,
      deliveryFee,
      commission: commissionOn(subtotal),
      totalAmount: subtotal + deliveryFee,
      shippingAddress,
      paymentMethod,
      status: 'confirmed', // the pharmacist prepared it, so there is nothing left to check
      paymentStatus: 'pending',
    });
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }

  // Only one acceptance wins if the patient double-submits.
  const updated = await Prescription.findOneAndUpdate(
    { _id: rx._id, 'offer.status': 'open', 'offer.version': version },
    { $set: { 'offer.status': 'accepted', 'offer.respondedAt': new Date(), 'offer.orderId': order._id, 'offer.chosen': lines.map((l) => l.medicineId) } },
    { returnDocument: 'after' }
  );
  if (!updated) {
    await Order.deleteOne({ _id: order._id });
    await releaseStock(reserved);
    throw new AppError(409, 'This offer is no longer open.', 'OFFER_CLOSED');
  }

  res.status(201).json({ order: { id: order._id, orderNumber: order.orderNumber, status: order.status, totalAmount: order.totalAmount } });
  notifyStaff('orders', {
    type: 'order',
    text: `${req.user.name || 'A patient'} accepted the offer for ${rxRef(rx)}: order ${order.orderNumber} (${rs(order.totalAmount)}) is confirmed and ready to prepare.`,
  });
  notifyOrderStatus(order, 'confirmed');
};

// @desc    Turn the pharmacy's offer down. The conversation stays open.
// @route   POST /api/prescriptions/:id/offer/decline
// @access  Private (Patient, owner)
exports.declineOffer = async (req, res) => {
  const rx = await loadOwn(req);
  const updated = await Prescription.findOneAndUpdate(
    { _id: rx._id, 'offer.status': 'open' },
    { $set: { 'offer.status': 'declined', 'offer.respondedAt': new Date() } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new AppError(409, 'This offer is no longer open.', 'OFFER_CLOSED');
  const [described] = await describe([updated]);
  res.json(described);
  notifyStaff('prescriptionOffers', { type: 'prescription', text: `${req.user.name || 'The patient'} said no thanks to the offer for ${rxRef(rx)}.` });
};

/* ─── Conversation between the patient and the pharmacy ──────────────────── */

/** Who is asking about a prescription's conversation, and whether they can still write. */
async function loadThread(req) {
  const rx = await Prescription.findById(req.params.id);
  if (!rx) throw new AppError(404, 'Prescription not found');
  const isOwner = String(rx.userId) === String(req.user._id);
  const isStaff = ['pharmacist', 'pharmacy'].includes(req.user.role);
  if (!isOwner && !isStaff && req.user.role !== 'admin') throw new AppError(403, 'Not authorized to view this conversation');
  const side = isOwner ? 'patient' : isStaff ? 'pharmacy' : null;
  // Open while the prescription can still be ordered from.
  const open = expiresAt(rx) > new Date();
  return { rx, side, open };
}

// @desc    Messages about a prescription (only newer ones with `after`)
// @route   GET /api/prescriptions/:id/messages
// @access  The patient and pharmacy staff; admins read-only
exports.listMessages = async (req, res) => {
  const { rx, side, open } = await loadThread(req);
  const filter = { prescriptionId: rx._id };
  if (req.query.after) filter.createdAt = { $gt: req.query.after };
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(500);
  if (side) {
    const other = side === 'patient' ? 'pharmacy' : 'patient';
    if (messages.some((m) => m.senderRole === other && !m.readAt)) {
      await Message.updateMany({ prescriptionId: rx._id, senderRole: other, readAt: null }, { $set: { readAt: new Date() } });
    }
    await markChatRead(req.user._id, `rx:${rx._id}`);
  }
  res.json({ messages, canSend: Boolean(side) && open, closesAt: expiresAt(rx) });
};

// @desc    Write to the pharmacy (patient) or to the patient (pharmacy staff)
// @route   POST /api/prescriptions/:id/messages
// @access  The patient and pharmacy staff, while the prescription is valid
exports.sendMessage = async (req, res) => {
  const { rx, side, open } = await loadThread(req);
  if (!side) throw new AppError(403, 'Only the patient and the pharmacy can write here');
  if (!open) throw new AppError(400, 'This prescription has expired, so the conversation is closed. Upload a new one to order again.', 'CHAT_CLOSED');

  const message = await Message.create({ prescriptionId: rx._id, sender: req.user._id, senderRole: side, text: req.body.text });
  await Prescription.updateOne({ _id: rx._id }, { $set: { lastMessageAt: message.createdAt, lastMessageFrom: side } });
  res.status(201).json(message);

  if (side === 'pharmacy') {
    notifyChat(rx.userId, `rx:${rx._id}`, { text: `The pharmacy sent you a message about prescription ${rxRef(rx)}.`, link: patientLink(rx) });
  } else {
    notifyStaff(rx.offer?.sentAt ? 'prescriptionOffers' : 'prescriptions', {
      type: 'chat',
      thread: `chat:rx:${rx._id}`,
      text: `${req.user.name || 'The patient'} sent a message about prescription ${rxRef(rx)}.`,
    });
  }
};

/* ─── A doctor's prescription from a MedEasy consultation ────────────────── */

// @desc    Send the prescription a doctor wrote after a completed consultation to the pharmacy, which
//          prepares an offer from it. Sending it again returns the one already sent.
// @route   POST /api/prescriptions/from-appointment/:appointmentId
// @access  Private (Patient, the appointment's patient)
exports.fromAppointment = async (req, res) => {
  const appointment = await Appointment.findById(req.params.appointmentId);
  if (!appointment) throw new AppError(404, 'Appointment not found');
  if (String(appointment.patientId) !== String(req.user._id)) throw new AppError(403, 'Not authorized to use this appointment');
  if (!appointment.prescription?.trim()) throw new AppError(400, 'The doctor didn’t write a prescription for this appointment.');

  const existing = await Prescription.findOne({ appointmentId: appointment._id, userId: req.user._id, status: { $ne: 'rejected' } }).sort({ createdAt: -1 });
  if (existing && expiresAt(existing) > new Date()) {
    const [described] = await describe([existing]);
    return res.json({ ...described, alreadySent: true });
  }

  const rx = await Prescription.create({
    userId: req.user._id,
    source: 'consultation',
    appointmentId: appointment._id,
    doctorId: appointment.doctorId,
    doctorText: appointment.prescription.trim(),
    status: 'pending',
  });
  res.status(201).json(withUsage(rx));
  notifyStaff('prescriptions', {
    type: 'prescription',
    text: `${req.user.name || 'A patient'} sent a doctor’s prescription from a MedEasy consultation (${rxRef(rx)}). Prepare an offer.`,
  });
};
