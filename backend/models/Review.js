const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  targetType: {
    type: String,
    required: true,
    enum: ['medicine', 'doctor', 'pharmacy']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);
