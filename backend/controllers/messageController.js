const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const { notifyChat, markChatRead } = require('../utils/notify');
const { sendEmail, escapeHtml } = require('../utils/mailer');
const { formatDay } = require('../utils/dates');

/** The chat stays open until this many days after the appointment date, then becomes read-only. */
const CHAT_OPEN_DAYS_AFTER = 3;

const SITE = () => process.env.FRONTEND_ORIGIN?.split(',')[0]?.trim() || 'https://medeasy.systems';
const chatLink = (role, id) => (role === 'doctor' ? `/doctor?tab=schedule&chat=${id}` : `/appointments/book?chat=${id}`);

/** Who is asking, and whether they may read (both sides and admins) or write (both sides) this chat. */
async function loadChat(req) {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email');
  if (!appointment) throw new AppError(404, 'Appointment not found');

  const me = String(req.user._id);
  const side = String(appointment.patientId?._id) === me ? 'patient' : String(appointment.doctorId?._id) === me ? 'doctor' : null;
  if (!side && req.user.role !== 'admin') throw new AppError(403, 'Not authorized to view this conversation');

  const closesAt = new Date(appointment.date);
  closesAt.setUTCDate(closesAt.getUTCDate() + CHAT_OPEN_DAYS_AFTER + 1); // end of the last open day
  const open = appointment.status !== 'cancelled' && Date.now() < closesAt.getTime();
  return { appointment, side, open, closesAt };
}

// @desc    Messages of an appointment's chat (only newer ones when `after` is given)
// @route   GET /api/appointments/:id/messages
// @access  The appointment's patient and doctor; admins (read-only)
exports.listMessages = async (req, res) => {
  const { appointment, side, open, closesAt } = await loadChat(req);
  const filter = { appointmentId: appointment._id };
  if (req.query.after) filter.createdAt = { $gt: req.query.after };
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(500);

  // Opening the chat reads the other side's messages.
  if (side) {
    const other = side === 'patient' ? 'doctor' : 'patient';
    const unread = messages.some((m) => m.senderRole === other && !m.readAt);
    if (unread) await Message.updateMany({ appointmentId: appointment._id, senderRole: other, readAt: null }, { $set: { readAt: new Date() } });
    await markChatRead(req.user._id, appointment._id);
  }

  res.json({ messages, canSend: Boolean(side) && open, closesAt });
};

// @desc    Send a message
// @route   POST /api/appointments/:id/messages
// @access  The appointment's patient and doctor, while the chat is open
exports.sendMessage = async (req, res) => {
  const { appointment, side, open } = await loadChat(req);
  if (!side) throw new AppError(403, 'Only the patient and the doctor can write in this chat');
  if (!open) {
    throw new AppError(400, appointment.status === 'cancelled' ? 'This appointment was cancelled, so the chat is closed.' : 'This chat has closed. Book a new appointment to talk to the doctor again.', 'CHAT_CLOSED');
  }

  const message = await Message.create({ appointmentId: appointment._id, sender: req.user._id, senderRole: side, text: req.body.text });
  res.status(201).json(message);

  // Tell the other side (after responding, so a slow email never delays the chat).
  const recipient = side === 'patient' ? appointment.doctorId : appointment.patientId;
  const recipientRole = side === 'patient' ? 'doctor' : 'patient';
  const senderName = side === 'doctor' ? `Dr. ${String(appointment.doctorId?.name || '').replace(/^Dr\.?\s*/i, '')}` : appointment.patientId?.name || 'Your patient';
  const day = formatDay(appointment.date);
  const link = chatLink(recipientRole, appointment._id);
  const isNewAlert = await notifyChat(recipient, appointment._id, { text: `${senderName} sent you a message about the appointment on ${day}.`, link });

  // One email per unread conversation, never the message itself (it may be medical). Keeps within the free email quota.
  if (isNewAlert && recipient?.email) {
    sendEmail({
      to: recipient.email,
      subject: `New message from ${senderName}`,
      title: 'You have a new message',
      bodyHtml: `<p>${escapeHtml(senderName)} sent you a message about the appointment on ${escapeHtml(day)}.</p><p>For your privacy we don’t include it here. Read and reply at <a href="${escapeHtml(SITE() + link)}">${escapeHtml(SITE())}</a>.</p>`,
    }).catch((err) => console.error('Chat email failed:', err.message));
  }
};
