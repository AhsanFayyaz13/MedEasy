const mongoose = require('mongoose');

/**
 * Everything patients send to the MedEasy team: site feedback, complaints about a consultation
 * or an order, and pharmacy ratings. Admins work through them in the Audits tab.
 *
 *   kind 'site'    – feedback about the platform (category: suggestion | bug | compliment | other)
 *   kind 'doctor'  – complaint about a consultation (appointmentId, doctorId)
 *   kind 'order'   – complaint about an order (orderId)
 *   kind 'rating'  – 1–5 rating of a delivered order (orderId); one per order, re-rating replaces it
 */
const KINDS = ['site', 'doctor', 'order', 'rating'];
const ACTIONS = ['resolved', 'sanction', 'archived'];

const { ObjectId } = mongoose.Schema.Types;

const feedbackSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, required: true },
    author: { type: ObjectId, ref: 'User', required: true },
    category: { type: String, trim: true, maxlength: 40 },
    subject: { type: String, trim: true, maxlength: 120 },
    text: { type: String, trim: true, maxlength: 2000 },
    rating: { type: Number, min: 1, max: 5 },
    appointmentId: { type: ObjectId, ref: 'Appointment' },
    doctorId: { type: ObjectId, ref: 'User' },
    orderId: { type: ObjectId, ref: 'Order' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    action: { type: String, enum: ACTIONS },
    resolvedBy: { type: ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true }
);

feedbackSchema.index({ kind: 1, createdAt: -1 });
feedbackSchema.index({ author: 1, createdAt: -1 });
// One rating per order (a new rating replaces the old one).
feedbackSchema.index({ orderId: 1, author: 1 }, { unique: true, partialFilterExpression: { kind: 'rating' } });

module.exports = mongoose.model('Feedback', feedbackSchema);
module.exports.KINDS = KINDS;
module.exports.ACTIONS = ACTIONS;
