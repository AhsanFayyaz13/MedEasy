const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  password: { type: String, required: true }, // bcrypt hash
  role: { 
    type: String, 
    enum: ['patient', 'pharmacist', 'doctor', 'admin', 'pharmacy'],
    default: 'patient'
  },
  address: { type: String },
  pharmacyName: { type: String },
  pharmacyLocation: { type: String },
  pharmacyOutsidePicture: { type: String },
  ownerName: { type: String },
  pharmacistName: { type: String },
  degreeName: { type: String },
  degreePlace: { type: String },
  licenseNumber: { type: String },
  // Doctor specific fields
  specialty: { type: String },
  pmcRegistration: { type: String },
  degree: { type: String },
  experience: { type: Number },
  clinicAddress: { type: String },
  availableDays: { type: [String], default: [] },
  consultationFee: { type: Number },
  termsAcceptedAt: { type: Date }, // when the user accepted the Terms of Service and Privacy Policy
  // Partner Agreement (doctors and pharmacies): which version and commission rate they accepted, and when.
  partnerAgreement: {
    version: { type: String },
    commissionRate: { type: Number, min: 0, max: 1 },
    acceptedAt: { type: Date },
  },
  verificationCode: { type: String, required: true }, // SHA-256 hash of the OTP, never the OTP itself
  verificationAttempts: { type: Number, default: 0 },
  verificationCodeExpires: { type: Date, required: true },
  verificationChannel: { type: String, enum: ['email', 'phone'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // TTL index: auto-deletes in 15 minutes (900 seconds)
});

pendingUserSchema.index({ phone: 1 });

module.exports = mongoose.model('PendingUser', pendingUserSchema);
