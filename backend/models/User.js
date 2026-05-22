const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['patient', 'pharmacist', 'doctor', 'admin'],
    default: 'patient'
  },
  phone: { type: String, unique: true, required: true },
  profileImage: { type: String },
  address: { type: String },
  
  // Profile verification status for professional roles (doctor, pharmacist)
  isVerifiedProfile: { type: Boolean, default: false },

  // Pharmacist specific fields
  pharmacyName: { type: String },
  degreeName: { type: String }, // e.g. Pharm.D, B.Pharm
  degreePlace: { type: String }, // Place/University of degree
  licenseNumber: { type: String }, // Pharmacy Council Registration

  // Doctor specific fields
  specialty: { type: String },
  pmcRegistration: { type: String }, // PMC/PMDC Registration number
  degree: { type: String }, // e.g. MBBS, FCPS, MD
  experience: { type: Number }, // Years of experience
  clinicAddress: { type: String }, // Physical clinic address
  availableDays: { type: [String], default: [] }, // e.g. ['Monday', 'Wednesday']
  consultationFee: { type: Number }, // Consultation fee in PKR

  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
