const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['patient', 'doctor', 'pharmacist', 'pharmacy']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contact', contactSchema);
