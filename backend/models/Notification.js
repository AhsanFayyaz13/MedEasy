const mongoose = require('mongoose');

/** Notifications are short-lived alerts, not records: they are deleted automatically after this long. */
const KEEP_FOR_SECONDS = 90 * 24 * 60 * 60;

const TYPES = ['booking', 'cancel', 'chat', 'prescription', 'order', 'account', 'system'];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TYPES, default: 'system' },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    link: { type: String, trim: true, maxlength: 200 },
    // Groups repeated alerts into one (e.g. every unread message in one chat): `chat:<appointmentId>`.
    thread: { type: String, maxlength: 60 },
    read: { type: Boolean, default: false },
    // When it last happened (a chat alert moves to the top when another message arrives).
    at: { type: Date, default: Date.now },
  }
);

notificationSchema.index({ recipient: 1, at: -1 });
notificationSchema.index({ recipient: 1, thread: 1, read: 1 });
// Keeps the free database tier small: old notifications disappear on their own.
notificationSchema.index({ at: 1 }, { expireAfterSeconds: KEEP_FOR_SECONDS });

notificationSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id,
    type: ret.type,
    text: ret.text,
    link: ret.link,
    thread: ret.thread,
    read: ret.read,
    createdAt: ret.at,
  }),
});

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.TYPES = TYPES;
