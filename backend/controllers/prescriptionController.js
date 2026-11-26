const Prescription = require('../models/Prescription');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { notify, notifyStaff } = require('../utils/notify');
const { notifyOrderStatus } = require('../utils/orders');

const { expiresAt, unusableReason } = Prescription;
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
  return { ...plain, expiresAt: expiresAt(plain), orders, usable: !problem, unusableReason: problem || undefined };
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
    const query = req.query.view === 'reviewed'
      ? Prescription.find({ status: { $ne: 'pending' } }).sort({ reviewedAt: -1 }).limit(100).populate('reviewedBy', 'name')
      : Prescription.find({ status: 'pending' }).sort({ createdAt: 1 });
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
