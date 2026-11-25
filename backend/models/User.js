const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
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
  // Set when an admin declines a doctor's or pharmacy's verification; cleared on approval.
  verificationDeclineReason: { type: String, trim: true, maxlength: 500 },
  verificationDeclinedAt: { type: Date },

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
  termsAcceptedAt: { type: Date }, // when the user accepted the Terms of Service and Privacy Policy
  
  // Password recovery fields
  resetPasswordCode: { type: String }, // SHA-256 hash of the OTP
  resetPasswordAttempts: { type: Number, default: 0 },
  resetPasswordExpires: { type: Date },
  // Sessions carry this number; bumping it (password changed or reset) ends every older session.
  tokenVersion: { type: Number, default: 0 },

}, {
  timestamps: true
});

/** Secrets that must never leave the server, whichever endpoint returns the user. */
const PRIVATE_FIELDS = ['password', 'resetPasswordCode', 'resetPasswordAttempts', 'resetPasswordExpires', 'tokenVersion', '__v'];

function stripPrivate(obj) {
  if (!obj) return obj;
  for (const field of PRIVATE_FIELDS) delete obj[field];
  if (obj.pharmacistDetails) {
    obj.pharmacistDetails = { ...obj.pharmacistDetails };
    delete obj.pharmacistDetails.password;
  }
  return obj;
}

// res.json(userDoc) and res.json([userDocs]) go through toJSON, so they are always safe.
userSchema.set('toJSON', { transform: (doc, ret) => stripPrivate(ret) });

/** Safe plain copy of a user document or object (for hand-built responses). */
userSchema.statics.toPublic = (user) => stripPrivate(typeof user?.toObject === 'function' ? user.toObject() : { ...user });

userSchema.index({ role: 1, isVerifiedProfile: 1 });
userSchema.index({ 'pharmacistDetails.email': 1 }, { sparse: true });
userSchema.index({ 'pharmacistDetails.status': 1 }, { sparse: true });

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }
  // A changed password ends every older session.
  if (!this.isNew) this.tokenVersion = (this.tokenVersion || 0) + 1;
  // Already hashed (e.g. copied from a PendingUser) — don't hash twice.
  if (BCRYPT_HASH.test(this.password)) {
    return;
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
