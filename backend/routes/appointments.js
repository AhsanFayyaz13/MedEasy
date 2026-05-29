const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  updateAppointment
} = require('../controllers/appointmentController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.route('/')
  .get(protect, getMyAppointments);

router.route('/book')
  .post(protect, authorizeRoles('patient'), bookAppointment);

router.route('/:id')
  .put(protect, updateAppointment)
  .patch(protect, updateAppointment);

module.exports = router;
