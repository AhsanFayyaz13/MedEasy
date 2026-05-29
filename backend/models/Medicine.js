const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  requiresPrescription: { type: Boolean, default: false },
  manufacturer: { type: String },
  expiryDate: { type: Date },
  imageUrl: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Medicine', medicineSchema);
