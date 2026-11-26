const mongoose = require('mongoose');

/**
 * How long an uploaded prescription can be used to order, counted from the day it was uploaded.
 * A prescription is used once (one order that isn't cancelled) unless the pharmacist marks it
 * refillable, in which case it can be reused until the longer refill window ends.
 */
const VALID_DAYS = 30;
const REFILL_VALID_DAYS = 180;
/** How long the patient has to accept a pharmacy's offer before stock and prices may have changed. */
const OFFER_HOURS = 48;

const { ObjectId } = mongoose.Schema.Types;

/**
 * What the pharmacy can supply for a prescription, prepared by a pharmacist from the paper:
 * each line is a catalogue medicine at the price offered, optionally with a note ("15 days'
 * supply, prescribed 20") or as an alternative for a prescribed medicine that isn't stocked.
 * The patient accepts it (it becomes a confirmed order) or says no thanks.
 */
const offerSchema = new mongoose.Schema({
  items: [{
    medicineId: { type: ObjectId, ref: 'Medicine', required: true },
    name: { type: String, required: true }, // as offered, so the offer reads the same later
    quantity: { type: Number, required: true, min: 1, max: 100 },
    price: { type: Number, required: true, min: 0 }, // per unit, honoured until the offer expires
    note: { type: String, trim: true, maxlength: 300 },
    // Set when this replaces a prescribed medicine; the patient has to choose it themselves.
    substituteFor: { type: String, trim: true, maxlength: 120 },
  }],
  // Prescribed medicines the pharmacy can't supply.
  unavailable: [{
    name: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 300 },
  }],
  message: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['open', 'accepted', 'declined'], default: 'open' },
  version: { type: Number, default: 1 }, // the patient accepts the version they saw
  sentBy: { type: ObjectId, ref: 'User' },
  sentAt: { type: Date },
  expiresAt: { type: Date },
  respondedAt: { type: Date },
  orderId: { type: ObjectId, ref: 'Order' },
  chosen: [{ type: ObjectId, ref: 'Medicine' }], // the lines the patient ordered
}, { _id: false });

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
  // An uploaded photo or PDF, or (source "consultation") the prescription a MedEasy doctor
  // wrote after a consultation, sent to the pharmacy by the patient.
  source: { type: String, enum: ['upload', 'consultation'], default: 'upload' },
  fileUrl: {
    type: String,
    required: function fileRequired() { return this.source !== 'consultation'; }
  },
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  doctorText: { type: String, maxlength: 5000 }, // the doctor's prescription, copied when sent
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  notes: { type: String, trim: true, maxlength: 500 }, // patient's note for the pharmacist
  rejectionReason: { type: String, trim: true, maxlength: 500 }, // shown to the patient
  // Set by the pharmacist when the prescription allows repeat supplies (e.g. long-term medicines).
  refillable: { type: Boolean, default: false },
  offer: { type: offerSchema, default: undefined },
  // Who wrote last in the prescription's conversation, so the pharmacy sees replies waiting.
  lastMessageAt: { type: Date },
  lastMessageFrom: { type: String, enum: ['patient', 'pharmacy'] },
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
prescriptionSchema.index({ 'offer.status': 1, 'offer.sentAt': -1 });
prescriptionSchema.index({ appointmentId: 1 }, { sparse: true });

/** The last moment a prescription can be used for a new order. */
function expiresAt(rx) {
  const d = new Date(rx.uploadedAt || rx.createdAt);
  d.setDate(d.getDate() + (rx.refillable ? REFILL_VALID_DAYS : VALID_DAYS));
  return d;
}

/**
 * Where the pharmacy's offer stands: null (none), 'open', 'expired', 'accepted' or 'declined'.
 * An open offer also closes once the prescription is used for an order some other way.
 */
function offerState(rx, activeOrders = 0) {
  const offer = rx.offer;
  if (!offer?.sentAt) return null;
  if (offer.status !== 'open') return offer.status;
  if (activeOrders > 0) return 'closed';
  return new Date(offer.expiresAt) < new Date() ? 'expired' : 'open';
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
module.exports.OFFER_HOURS = OFFER_HOURS;
module.exports.offerState = offerState;
