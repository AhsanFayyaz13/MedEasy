const Prescription = require('../models/Prescription');
const { getIO } = require('../socket');

// @desc    Upload prescription
// @route   POST /api/prescriptions/upload
// @access  Private (Patient)
exports.uploadPrescription = async (req, res) => {
  try {
    let fileUrl = '';

    if (req.body.fileUrl) {
      fileUrl = req.body.fileUrl;
    } else if (req.file) {
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      const mimeType = req.file.mimetype;
      const base64Data = fileBuffer.toString('base64');
      fileUrl = `data:${mimeType};base64,${base64Data}`;

      // Clean up local temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    } else {
      return res.status(400).json({ message: 'No file uploaded or URL provided' });
    }

    const prescription = await Prescription.create({
      userId: req.user._id,
      fileUrl,
      status: 'pending'
    });

    // Emit realtime event after persisting
    try {
      const io = getIO();
      io.emit('prescription:created', prescription);
    } catch (e) {
      console.warn('Could not emit prescription:created', e.message);
    }

    res.status(201).json(prescription);
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get prescriptions (Patient gets own, Pharmacist gets all pending)
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res) => {
  try {
    if (req.user.role === 'pharmacist' || req.user.role === 'pharmacy' || req.user.role === 'admin') {
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

      // Emit realtime update
      try {
        const io = getIO();
        io.emit('prescription:updated', updatedPrescription);
      } catch (e) {
        console.warn('Could not emit prescription:updated', e.message);
      }

      res.json(updatedPrescription);
    } else {
      res.status(404).json({ message: 'Prescription not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a pending prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Patient/Owner)
exports.deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Ensure the user owns the prescription
    if (prescription.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this prescription' });
    }

    // Only allow deleting pending prescriptions
    if (prescription.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending prescriptions can be deleted' });
    }

    await prescription.deleteOne();

    try {
      const io = getIO();
      io.emit('prescription:deleted', { id: prescription._id.toString() });
    } catch (e) {
      console.warn('Could not emit prescription:deleted', e.message);
    }

    res.json({ message: 'Prescription removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
