const express = require('express');
const router = express.Router();
const {
  addReview,
  getReviews,
  getAverageRating
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getReviews)
  .post(protect, addReview);

router.route('/:targetType/:targetId')
  .get(getReviews);

router.route('/:targetType/:targetId/average')
  .get(getAverageRating);

module.exports = router;
