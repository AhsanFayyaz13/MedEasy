const express = require('express');
const ctrl = require('../controllers/feedbackController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { feedbackLimiter } = require('../middleware/security');
const { validate } = require('../middleware/validate');
const { idParam, feedback: v } = require('../validators');

const router = express.Router();

router.use(protect);
router.post('/', feedbackLimiter, validate({ body: v.submit }), ctrl.submitFeedback);
router.get('/', authorizeRoles('admin'), validate({ query: v.list }), ctrl.listFeedback);
router.put('/:id', authorizeRoles('admin'), validate({ params: idParam, body: v.resolve }), ctrl.resolveFeedback);

module.exports = router;
