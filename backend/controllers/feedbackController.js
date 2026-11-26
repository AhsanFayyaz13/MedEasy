const Feedback = require('../models/Feedback');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { notify, notifyStaff } = require('../utils/notify');
const { formatDay } = require('../utils/dates');

const PHARMACY = 'MedEasy Pharmacy Partner';
const ref = (order) => order.orderNumber || `#${String(order._id).slice(-8).toUpperCase()}`;

/** The shape the admin Audits tab shows (names resolved, no internal ids beyond what it links to). */
function present(f) {
  const author = f.author || {};
  const doctor = f.doctorId || {};
  const order = f.orderId || {};
  return {
    id: f._id,
    kind: f.kind,
    category: f.category,
    subject: f.subject,
    text: f.text,
    rating: f.rating,
    status: f.status,
    action: f.action,
    createdAt: f.createdAt,
    resolvedAt: f.resolvedAt,
    author: { name: author.name || 'Former user', email: author.email || '' },
    appointmentId: f.appointmentId,
    doctor: f.kind === 'doctor' ? { id: doctor._id, name: doctor.name || 'Doctor', specialty: doctor.specialty || '', status: doctor.status } : undefined,
    order: order._id ? { id: order._id, ref: ref(order), pharmacyName: PHARMACY } : undefined,
  };
}

// @desc    Send feedback, a complaint or a rating to the MedEasy team
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
  const { kind, category, subject, text, rating, appointmentId, orderId } = req.body;
  const me = req.user._id;
  const entry = { kind, author: me, category, subject, text };

  if (kind === 'doctor') {
    const apt = await Appointment.findById(appointmentId).populate('doctorId', 'name');
    if (!apt) throw new AppError(404, 'Appointment not found');
    if (String(apt.patientId) !== String(me)) throw new AppError(403, 'You can only report your own appointments');
    Object.assign(entry, { appointmentId: apt._id, doctorId: apt.doctorId?._id });
    entry.subject = `${apt.doctorId?.name || 'Doctor'} · ${formatDay(apt.date)}`;
  }

  if (kind === 'order' || kind === 'rating') {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError(404, 'Order not found');
    if (String(order.userId) !== String(me)) throw new AppError(403, 'You can only give feedback on your own orders');
    if (kind === 'rating' && order.status !== 'delivered') throw new AppError(400, 'You can rate an order once it has been delivered.');
    if (kind === 'order' && order.status === 'pending') throw new AppError(400, 'This order hasn’t been confirmed yet. You can cancel it instead.');
    entry.orderId = order._id;
    entry.subject = ref(order);
  }

  let saved;
  if (kind === 'rating') {
    // Rating the same order again replaces the earlier rating.
    saved = await Feedback.findOneAndUpdate(
      { kind, author: me, orderId: entry.orderId },
      { $set: { rating, text, subject: entry.subject, status: 'open' }, $unset: { action: 1, resolvedAt: 1, resolvedBy: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  } else {
    saved = await Feedback.create({ ...entry, rating: kind === 'site' ? rating : undefined });
  }

  res.status(201).json({ id: saved._id, kind: saved.kind, status: saved.status, createdAt: saved.createdAt });

  if (kind === 'doctor' || kind === 'order') {
    const what = kind === 'doctor' ? `consultation (${entry.subject})` : `order ${entry.subject}`;
    notifyStaff('complaints', { type: 'system', text: `New complaint from ${req.user.name || 'a patient'} about ${what}.` });
  }
};

// @desc    Everything sent to the team, newest first (optionally one kind)
// @route   GET /api/feedback
// @access  Private (admin)
exports.listFeedback = async (req, res) => {
  const filter = req.query.kind ? { kind: req.query.kind } : {};
  const items = await Feedback.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('author', 'name email')
    .populate('doctorId', 'name specialty status')
    .populate('orderId', 'orderNumber')
    .lean();
  res.json({ items: items.map(present) });
};

// @desc    Resolve, archive or record a sanction on an item
// @route   PUT /api/feedback/:id
// @access  Private (admin)
exports.resolveFeedback = async (req, res) => {
  const { action = 'resolved' } = req.body;
  const item = await Feedback.findById(req.params.id);
  if (!item) throw new AppError(404, 'Not found');
  const wasOpen = item.status === 'open';
  Object.assign(item, { status: 'resolved', action, resolvedBy: req.user._id, resolvedAt: new Date() });
  await item.save();
  res.json({ id: item._id, status: item.status, action: item.action, resolvedAt: item.resolvedAt });

  // Let the patient know their complaint was looked at (not for archived ratings or feedback).
  if (wasOpen && (item.kind === 'doctor' || item.kind === 'order')) {
    const link = item.kind === 'doctor' ? '/appointments/book' : '/orders';
    notify(item.author, { type: 'system', text: `Your complaint about ${item.subject || 'your request'} has been reviewed by our team. Thank you for telling us.`, link });
  }
};
