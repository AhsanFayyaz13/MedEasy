const express = require('express');
const ctrl = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam, reviews: v } = require('../validators');

const router = express.Router();

router
  .route('/')
  .get(validate({ query: v.list }), ctrl.getReviews)
  .post(protect, validate({ body: v.add }), ctrl.addReview);

// Authors can edit or delete their own review (admins can delete any).
router
  .route('/:id')
  .put(protect, validate({ params: idParam, body: v.edit }), ctrl.updateReview)
  .delete(protect, validate({ params: idParam }), ctrl.deleteReview);

router.get('/:targetType/:targetId', validate({ params: v.targetParams, query: v.list }), ctrl.getReviews);
router.get('/:targetType/:targetId/average', validate({ params: v.targetParams }), ctrl.getAverageRating);

module.exports = router;
