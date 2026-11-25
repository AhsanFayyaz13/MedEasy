const express = require('express');
const ctrl = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { reviews: v } = require('../validators');

const router = express.Router();

router
  .route('/')
  .get(validate({ query: v.list }), ctrl.getReviews)
  .post(protect, validate({ body: v.add }), ctrl.addReview);

router.get('/:targetType/:targetId', validate({ params: v.targetParams, query: v.list }), ctrl.getReviews);
router.get('/:targetType/:targetId/average', validate({ params: v.targetParams }), ctrl.getAverageRating);

module.exports = router;
