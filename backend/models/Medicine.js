const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  brand: { type: String, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  category: { type: String, required: true, trim: true, maxlength: 120 },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  requiresPrescription: { type: Boolean, default: false },
  manufacturer: { type: String },
  expiryDate: { type: Date },
  imageUrl: { type: String }
}, {
  timestamps: true
});

medicineSchema.index({ category: 1 });
medicineSchema.index({ name: 'text', brand: 'text', category: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
