const mongoose = require('mongoose');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res) => {
  const { targetType, targetId, rating, comment } = req.body;
  const normalizedTargetType = targetType || 'pharmacy';
  const normalizedTargetId = targetId || '000000000000000000000000';

  // Doctor reviews are limited to patients who completed a consultation with that doctor.
  if (normalizedTargetType === 'doctor') {
    const consulted = await Appointment.exists({ patientId: req.user._id, doctorId: normalizedTargetId, status: 'completed' });
    if (!consulted) {
      return res.status(403).json({ message: 'You can review a doctor after a completed consultation with them' });
    }
  }

  // Check if user already reviewed this target
  const alreadyReviewed = await Review.findOne({
    userId: req.user._id,
    targetId: normalizedTargetId,
    targetType: normalizedTargetType
  });

  if (alreadyReviewed) {
    return res.status(409).json({ message: 'You have already reviewed this item' });
  }

  const review = new Review({
    userId: req.user._id,
    targetType: normalizedTargetType,
    targetId: normalizedTargetId,
    rating: Number(rating),
    comment
  });

  const createdReview = await review.save();
  res.status(201).json(createdReview);
};

// @desc    Edit your own review
// @route   PUT /api/reviews/:id
// @access  Private (author)
exports.updateReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (review.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only edit your own review' });
  }
  review.rating = req.body.rating;
  review.comment = req.body.comment;
  await review.save();
  res.json(await review.populate('userId', 'name'));
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (author or admin)
exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own review' });
  }
  await review.deleteOne();
  res.json({ message: 'Review deleted' });
};

// @desc    Get reviews for a specific target or recent reviews
// @route   GET /api/reviews
// @route   GET /api/reviews/:targetType/:targetId
// @access  Public
exports.getReviews = async (req, res) => {
  const { targetType: paramTargetType, targetId: paramTargetId } = req.params;
  const { targetType: queryTargetType, targetId: queryTargetId, limit } = req.query;

  const targetType = paramTargetType || queryTargetType;
  const targetId = paramTargetId || queryTargetId;
  const filter = {};

  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = targetId;

  const query = Review.find(filter).populate('userId', 'name').sort({ createdAt: -1 });
  query.limit(Math.min(Number(limit) || 100, 100));

  const reviews = await query;
  res.json(reviews);
};

// @desc    Get average rating for a target
// @route   GET /api/reviews/:targetType/:targetId/average
// @access  Public
exports.getAverageRating = async (req, res) => {
  const { targetType, targetId } = req.params;

  const [stats] = await Review.aggregate([
    { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (!stats) {
    return res.json({ averageRating: 0, totalReviews: 0 });
  }
  res.json({ averageRating: Number(stats.avg.toFixed(1)), totalReviews: stats.count });
};
