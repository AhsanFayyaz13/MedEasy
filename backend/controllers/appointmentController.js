const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Book a new appointment
// @route   POST /api/appointments/book
// @access  Private (Patient)
exports.bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, time } = req.body;

    // Check if doctor exists and has role 'doctor'
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const appointment = new Appointment({
      patientId: req.user._id,
      doctorId,
      date,
      time,
      status: 'scheduled'
    });

    const createdAppointment = await appointment.save();
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
    let appointments;
    if (req.user.role === 'doctor') {
      appointments = await Appointment.find({ doctorId: req.user._id })
        .populate('patientId', 'name email phone')
        .sort({ date: 1, time: 1 });
    } else if (req.user.role === 'patient') {
      appointments = await Appointment.find({ patientId: req.user._id })
        .populate('doctorId', 'name email')
        .sort({ date: 1, time: 1 });
    } else if (req.user.role === 'admin' || req.user.role === 'pharmacist') {
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
    const { status, consultationNotes } = req.body;
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
    
    if (consultationNotes && (isDoctor || req.user.role === 'admin')) {
      appointment.consultationNotes = consultationNotes;
    }

    const updatedAppointment = await appointment.save();
    res.json(updatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
