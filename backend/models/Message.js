const mongoose = require('mongoose');

/** One chat message between a patient and their doctor, kept with the appointment as part of its record. */
const messageSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['patient', 'doctor'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ appointmentId: 1, createdAt: 1 });

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
