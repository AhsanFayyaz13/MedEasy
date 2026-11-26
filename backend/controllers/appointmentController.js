const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { commissionOn } = require('../config/partner');
const { notify } = require('../utils/notify');
const { formatDay } = require('../utils/dates');

const DOCTOR_LINK = '/doctor?tab=schedule';
const PATIENT_LINK = '/appointments/book';
const drName = (name) => `Dr. ${String(name || '').replace(/^Dr\.?\s*/i, '')}`.trim();

// @desc    Book a new appointment
// @route   POST /api/appointments/book
// @access  Private (Patient)
exports.bookAppointment = async (req, res) => {
  const { doctorId, doctor, date, time, reason } = req.body;
  const resolvedDoctorId = doctorId || doctor;

  // ── End-to-End Date Validation System ──
  if (!date) {
    return res.status(400).json({ message: 'Appointment date is required.' });
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: 'Please provide a valid calendar date.' });
  }

  // Set hours to 0 to compare dates strictly
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingDate = new Date(parsedDate);
  bookingDate.setUTCHours(0, 0, 0, 0); // stored as midnight UTC of the booked day, whatever the server time zone

  if (bookingDate < today) {
    return res.status(400).json({ message: 'You cannot book an appointment for a past date.' });
  }

  const maxAdvanceBookingDate = new Date();
  maxAdvanceBookingDate.setDate(today.getDate() + 30);
  maxAdvanceBookingDate.setHours(0, 0, 0, 0);

  if (bookingDate > maxAdvanceBookingDate) {
    return res.status(400).json({ message: 'Appointments can only be booked up to 30 days in advance.' });
  }

  // Check the doctor exists, is approved and active
  const doctorUser = await User.findById(resolvedDoctorId);
  if (!doctorUser || doctorUser.role !== 'doctor' || !doctorUser.isVerifiedProfile || doctorUser.status === 'suspended') {
    return res.status(404).json({ message: 'Doctor not found' });
  }

  const appointment = new Appointment({
    patientId: req.user._id,
    doctorId: resolvedDoctorId,
    date: bookingDate,
    time,
    reason: reason || undefined,
    // Fee at booking time, and the Partner Agreement commission on it.
    fee: doctorUser.consultationFee || 0,
    commission: commissionOn(doctorUser.consultationFee),
    status: 'scheduled'
  });

  const createdAppointment = await appointment.save();
  res.status(201).json(createdAppointment);
  notify(doctorUser._id, {
    type: 'booking',
    text: `New booking: ${req.user.name} on ${formatDay(bookingDate)} at ${time}.`,
    link: DOCTOR_LINK,
  });
};

// @desc    Get appointments for logged-in user (role based)
// @route   GET /api/appointments
// @access  Private
exports.getMyAppointments = async (req, res) => {
  let appointments = [];
  if (req.user.role === 'doctor') {
    appointments = await Appointment.find({ doctorId: req.user._id })
      .populate('patientId', 'name email phone')
      .sort({ date: 1, time: 1 });
  } else if (req.user.role === 'patient') {
    appointments = await Appointment.find({ patientId: req.user._id })
      .populate('doctorId', 'name email')
      .sort({ date: 1, time: 1 });
  } else if (req.user.role === 'admin' || req.user.role === 'pharmacist' || req.user.role === 'pharmacy') {
    appointments = await Appointment.find()
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .sort({ date: 1, time: 1 });
  }

  res.json(appointments);
};

// @desc    Update appointment status/notes
// @route   PUT /api/appointments/:id
// @access  Private (Doctor or Patient)
exports.updateAppointment = async (req, res) => {
  const { status, consultationNotes, notes, prescription, date, time } = req.body;
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({ message: 'Appointment not found' });
  }

  // Check authorization: patient can cancel, doctor can complete/cancel/add notes
  const isPatient = appointment.patientId.toString() === req.user._id.toString();
  const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
  
  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to update this appointment' });
  }

  const isStaff = isDoctor || req.user.role === 'admin';
  if (!isStaff && status && status !== 'cancelled') {
    return res.status(403).json({ message: 'Patients can only cancel appointments' });
  }
  if (!isStaff && (notes || consultationNotes || prescription || date || time)) {
    return res.status(403).json({ message: 'Only the doctor can edit appointment details' });
  }

  if (notes && (isDoctor || req.user.role === 'admin')) {
    appointment.notes = notes;
    appointment.consultationNotes = notes;
  }
  if (consultationNotes && (isDoctor || req.user.role === 'admin')) {
    appointment.notes = consultationNotes;
    appointment.consultationNotes = consultationNotes;
  }
  if (prescription && (isDoctor || req.user.role === 'admin')) {
    appointment.prescription = prescription;
  }
  if (date && (isDoctor || req.user.role === 'admin')) {
    appointment.date = date;
  }
  if (time && (isDoctor || req.user.role === 'admin')) {
    appointment.time = time;
  }

  const before = { status: appointment.status, date: appointment.date?.getTime(), time: appointment.time };
  if (status) appointment.status = status;
  const updatedAppointment = await appointment.save();
  res.json(updatedAppointment);
  notifyAppointmentChange(updatedAppointment, before, { req, isPatient, isDoctor });
};

/** Tell the other side (both sides, when an admin made the change) what changed. */
async function notifyAppointmentChange(apt, before, { req, isPatient, isDoctor }) {
  try {
    const cancelled = apt.status === 'cancelled' && before.status !== 'cancelled';
    const completed = apt.status === 'completed' && before.status !== 'completed';
    const moved = !cancelled && (apt.date?.getTime() !== before.date || apt.time !== before.time);
    if (!cancelled && !completed && !moved) return;

    const [patient, doctor] = await Promise.all([User.findById(apt.patientId).select('name'), User.findById(apt.doctorId).select('name')]);
    const day = formatDay(apt.date);
    const dr = drName(doctor?.name);
    const byAdmin = !isPatient && !isDoctor;

    if (cancelled) {
      if (!isPatient) notify(apt.patientId, { type: 'cancel', text: `${byAdmin ? 'MedEasy' : dr} cancelled your appointment ${byAdmin ? `with ${dr} ` : ''}on ${day} at ${apt.time}.`, link: PATIENT_LINK });
      if (!isDoctor) notify(apt.doctorId, { type: 'cancel', text: `${byAdmin ? 'MedEasy cancelled the' : `${patient?.name || 'Your patient'} cancelled their`} appointment on ${day} at ${apt.time}${byAdmin ? ` with ${patient?.name || 'your patient'}` : ''}.`, link: DOCTOR_LINK });
      return;
    }
    if (completed && !isPatient) {
      notify(apt.patientId, {
        type: 'prescription',
        text: apt.prescription ? `${dr} completed your consultation and issued a prescription.` : `${dr} completed your consultation on ${day}.`,
        link: PATIENT_LINK,
      });
    }
    if (moved) {
      const text = `Appointment moved: ${dr} with ${patient?.name || 'the patient'} is now on ${day} at ${apt.time}.`;
      if (!isPatient) notify(apt.patientId, { type: 'booking', text, link: PATIENT_LINK });
      if (!isDoctor) notify(apt.doctorId, { type: 'booking', text, link: DOCTOR_LINK });
    }
  } catch (err) {
    console.error('Appointment notification failed:', err.message, req.originalUrl);
  }
}
