const Prescription = require('../models/Prescription');

// @desc    Upload prescription
// @route   POST /api/prescriptions/upload
// @access  Private (Patient)
exports.uploadPrescription = async (req, res) => {
  try {
    let fileUrl = '';

    if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    } else if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ message: 'No file uploaded or URL provided' });
    }

    const prescription = await Prescription.create({
      userId: req.user._id,
      fileUrl,
      status: 'pending'
    });

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get prescriptions (Patient gets own, Pharmacist gets all pending)
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
  try {
    if (req.user.role === 'pharmacist' || req.user.role === 'admin') {
      const prescriptions = await Prescription.find({ status: 'pending' }).populate('userId', 'name email');
      return res.json(prescriptions);
    } else {
      const prescriptions = await Prescription.find({ userId: req.user._id });
      return res.json(prescriptions);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify prescription
// @route   PUT /api/prescriptions/:id/verify
// @access  Private (Pharmacist)
exports.verifyPrescription = async (req, res) => {
  try {
    const { status, doctorId } = req.body;
    const prescription = await Prescription.findById(req.params.id);

    if (prescription) {
      prescription.status = status || prescription.status;
      if (doctorId) {
        prescription.doctorId = doctorId;
      }

      const updatedPrescription = await prescription.save();
      res.json(updatedPrescription);
    } else {
      res.status(404).json({ message: 'Prescription not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
