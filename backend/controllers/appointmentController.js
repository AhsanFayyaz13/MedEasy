const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { getIO } = require('../socket');

// @desc    Book a new appointment
// @route   POST /api/appointments/book
// @access  Private (Patient)
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorId, doctor, date, time } = req.body;
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
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return res.status(400).json({ message: 'You cannot book an appointment for a past date.' });
    }

    const maxAdvanceBookingDate = new Date();
    maxAdvanceBookingDate.setDate(today.getDate() + 30);
    maxAdvanceBookingDate.setHours(0, 0, 0, 0);

    if (bookingDate > maxAdvanceBookingDate) {
      return res.status(400).json({ message: 'Appointments can only be booked up to 30 days in advance.' });
    }

    // Check if doctor exists and has role 'doctor'
    const doctorUser = await User.findById(resolvedDoctorId);
    if (!doctorUser || doctorUser.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointment = new Appointment({
      patientId: req.user._id,
      doctorId: resolvedDoctorId,
      date: bookingDate,
      time,
      status: 'scheduled'
    });

    const createdAppointment = await appointment.save();

    try {
      const io = getIO();
      io.emit('appointment:booked', createdAppointment);
    } catch (e) {
      console.warn('Could not emit appointment:booked', e.message);
    }

    res.status(201).json(createdAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get appointments for logged-in user (role based)
// @route   GET /api/appointments
// @access  Private
exports.getMyAppointments = async (req, res) => {
  try {
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
        .populate('doctorId', 'name email')
        .sort({ date: 1, time: 1 });
    }

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment status/notes
// @route   PUT /api/appointments/:id
// @access  Private (Doctor or Patient)
exports.updateAppointment = async (req, res) => {
  try {
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

    if (isPatient && status && status !== 'cancelled') {
        return res.status(403).json({ message: 'Patients can only cancel appointments' });
    }

    if (status) {
      appointment.status = status;
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

    const updatedAppointment = await appointment.save();

    try {
      const io = getIO();
      io.emit('appointment:updated', updatedAppointment);
    } catch (e) {
      console.warn('Could not emit appointment:updated', e.message);
    }

    res.json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
