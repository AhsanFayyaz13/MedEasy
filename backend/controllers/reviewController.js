const Review = require('../models/Review');

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { targetType, targetId, rating, comment } = req.body;

    // Check if user already reviewed this target
    const alreadyReviewed = await Review.findOne({
      userId: req.user._id,
      targetId,
      targetType
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this item' });
    }

    const review = new Review({
      userId: req.user._id,
      targetType,
      targetId,
      rating: Number(rating),
      comment
    });

    const createdReview = await review.save();
    res.status(201).json(createdReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a specific target
// @route   GET /api/reviews/:targetType/:targetId
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const reviews = await Review.find({ targetType, targetId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get average rating for a target
// @route   GET /api/reviews/:targetType/:targetId/average
// @access  Public
exports.getAverageRating = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const reviews = await Review.find({ targetType, targetId });
    if (reviews.length === 0) {
      return res.json({ averageRating: 0, totalReviews: 0 });
    }

    const totalRating = reviews.reduce((acc, item) => item.rating + acc, 0);
    const averageRating = totalRating / reviews.length;

    res.json({ averageRating: Number(averageRating.toFixed(1)), totalReviews: reviews.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
