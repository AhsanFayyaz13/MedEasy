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
    type: String,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

// One review per user per target; fast lookups by target.
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
