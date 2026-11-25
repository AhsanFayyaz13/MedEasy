const express = require('express');
const ctrl = require('../controllers/appointmentController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam, appointments: v } = require('../validators');

const router = express.Router();

router.get('/', protect, ctrl.getMyAppointments);
router.post('/book', protect, authorizeRoles('patient'), validate({ body: v.book }), ctrl.bookAppointment);
router
  .route('/:id')
  .put(protect, validate({ params: idParam, body: v.update }), ctrl.updateAppointment)
  .patch(protect, validate({ params: idParam, body: v.update }), ctrl.updateAppointment);

module.exports = router;
