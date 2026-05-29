const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get all verified medical professionals (doctors)
// @route   GET /api/doctors
// @access  Private (Registered Users)
router.get('/', protect, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isVerifiedProfile: true })
      .select('name email phone specialty pmcRegistration degree experience clinicAddress availableDays consultationFee profileImage');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
