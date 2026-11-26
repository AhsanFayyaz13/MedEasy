const mongoose = require('mongoose');

/**
 * One chat message, kept with what it is about as part of its record: an appointment (patient and
 * doctor) or a prescription (patient and pharmacy). Exactly one of the two ids is set.
 */
const messageSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['patient', 'doctor', 'pharmacy'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function oneSubject() {
  if (Boolean(this.appointmentId) === Boolean(this.prescriptionId)) {
    this.invalidate('appointmentId', 'A message belongs to either an appointment or a prescription.');
  }
});

messageSchema.index({ appointmentId: 1, createdAt: 1 });
messageSchema.index({ prescriptionId: 1, createdAt: 1 });

messageSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id,
    senderRole: ret.senderRole,
    text: ret.text,
    createdAt: ret.createdAt,
    readAt: ret.readAt,
  }),
});

module.exports = mongoose.model('Message', messageSchema);
