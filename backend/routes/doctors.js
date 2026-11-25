const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/doctors — verified, active doctors.
 * Private (any signed-in user). Express 5 forwards async errors to the error handler.
 */
router.get('/', protect, async (req, res) => {
  const doctors = await User.find({ role: 'doctor', isVerifiedProfile: true, status: { $ne: 'suspended' } })
    .select('name email phone specialty pmcRegistration degree experience clinicAddress availableDays consultationFee profileImage')
    .lean();
  res.json(doctors);
});

module.exports = router;
