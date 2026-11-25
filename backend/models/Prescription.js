const mongoose = require('mongoose');

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
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

prescriptionSchema.index({ userId: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
