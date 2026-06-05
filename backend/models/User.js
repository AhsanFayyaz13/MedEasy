const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['patient', 'pharmacist', 'doctor', 'admin', 'pharmacy'],
    default: 'patient'
  },
  phone: { type: String, unique: true, required: true },
  profileImage: { type: String },
  address: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'suspended'], 
    default: 'active' 
  },
  
  // Profile verification status for professional roles (doctor, pharmacist, pharmacy)
  isVerifiedProfile: { type: Boolean, default: false },

  // Pharmacy / Pharmacist specific fields
  pharmacyName: { type: String },
  pharmacyLocation: { type: String },
  pharmacyOutsidePicture: { type: String },
  ownerName: { type: String },
  pharmacistName: { type: String },
  degreeName: { type: String }, // e.g. Pharm.D, B.Pharm
  degreePlace: { type: String }, // Place/University of degree
  licenseNumber: { type: String }, // Pharmacy Council Registration

  // Pharmacist representative details (added post-login and admin-verified)
  pharmacistDetails: {
    name: { type: String },
    photo: { type: String },
    licenseNumber: { type: String },
    age: { type: Number },
    degreeName: { type: String },
    degreePlace: { type: String },
    email: { type: String },
    password: { type: String },
    status: { 
      type: String, 
      enum: ['none', 'pending', 'approved', 'declined'], 
      default: 'none' 
    },
    declineReason: { type: String }
  },

  // Doctor specific fields
  specialty: { type: String },
  pmcRegistration: { type: String }, // PMC/PMDC Registration number
  degree: { type: String }, // e.g. MBBS, FCPS, MD
  experience: { type: Number }, // Years of experience
  clinicAddress: { type: String }, // Physical clinic address
  availableDays: { type: [String], default: [] }, // e.g. ['Monday', 'Wednesday']
  consultationFee: { type: Number }, // Consultation fee in PKR
  
  // Password recovery fields
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },

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
