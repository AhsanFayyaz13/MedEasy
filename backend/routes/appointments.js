const express = require('express');
const ctrl = require('../controllers/appointmentController');
const chat = require('../controllers/messageController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { pollLimiter, messageLimiter } = require('../middleware/security');
const { idParam, appointments: v, messages: m } = require('../validators');

const router = express.Router();

router.get('/', protect, ctrl.getMyAppointments);
router.post('/book', protect, authorizeRoles('patient'), validate({ body: v.book }), ctrl.bookAppointment);
router
  .route('/:id')
  .put(protect, validate({ params: idParam, body: v.update }), ctrl.updateAppointment)
  .patch(protect, validate({ params: idParam, body: v.update }), ctrl.updateAppointment);

// Patient–doctor chat for one appointment.
router
  .route('/:id/messages')
  .get(protect, pollLimiter, validate({ params: idParam, query: m.list }), chat.listMessages)
  .post(protect, messageLimiter, validate({ params: idParam, body: m.send }), chat.sendMessage);

module.exports = router;
