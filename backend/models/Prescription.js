const mongoose = require('mongoose');

/**
 * How long an uploaded prescription can be used to order, counted from the day it was uploaded.
 * A prescription is used once (one order that isn't cancelled) unless the pharmacist marks it
 * refillable, in which case it can be reused until the longer refill window ends.
 */
const VALID_DAYS = 30;
const REFILL_VALID_DAYS = 180;

const prescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fileUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  notes: { type: String, trim: true, maxlength: 500 }, // patient's note for the pharmacist
  rejectionReason: { type: String, trim: true, maxlength: 500 }, // shown to the patient
  // Set by the pharmacist when the prescription allows repeat supplies (e.g. long-term medicines).
  refillable: { type: Boolean, default: false },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

prescriptionSchema.index({ userId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ status: 1, reviewedAt: -1 });

/** The last moment a prescription can be used for a new order. */
function expiresAt(rx) {
  const d = new Date(rx.uploadedAt || rx.createdAt);
  d.setDate(d.getDate() + (rx.refillable ? REFILL_VALID_DAYS : VALID_DAYS));
  return d;
}

/**
 * Why a prescription can't be used for a new order, or null if it can.
 * `activeOrders` is how many orders that aren't cancelled already use it.
 */
function unusableReason(rx, activeOrders = 0) {
  if (rx.status === 'rejected') return 'This prescription was declined. Please upload a valid prescription.';
  if (expiresAt(rx) < new Date()) return 'This prescription has expired. Please upload a recent one.';
  if (!rx.refillable && activeOrders > 0) return 'This prescription has already been used for an order. Please upload a new one.';
  return null;
}

module.exports = mongoose.model('Prescription', prescriptionSchema);
module.exports.VALID_DAYS = VALID_DAYS;
module.exports.REFILL_VALID_DAYS = REFILL_VALID_DAYS;
module.exports.expiresAt = expiresAt;
module.exports.unusableReason = unusableReason;
