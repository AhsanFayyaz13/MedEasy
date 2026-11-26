const express = require('express');
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { pollLimiter } = require('../middleware/security');
const { validate } = require('../middleware/validate');
const { idParam, notifications: v } = require('../validators');

const router = express.Router();

router.use(protect);
router.get('/', pollLimiter, validate({ query: v.list }), ctrl.listNotifications);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', validate({ params: idParam }), ctrl.markRead);

module.exports = router;
