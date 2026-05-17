const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  requiresPrescription: { type: Boolean, default: false },
  manufacturer: { type: String },
  expiryDate: { type: Date },
  imageUrl: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Medicine', medicineSchema);
