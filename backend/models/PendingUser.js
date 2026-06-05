const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  password: { type: String, required: true },
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
  verificationCode: { type: String, required: true },
  verificationCodeExpires: { type: Date, required: true },
  verificationChannel: { type: String, enum: ['email', 'phone'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // TTL index: auto-deletes in 15 minutes (900 seconds)
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
