const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  uploadProfilePhoto,
  verifyRegistration, 
  resendVerificationCode,
  updatePharmacistDetails,
  removePharmacistDetails,
  uploadPharmacistPhoto,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const upload = require('../middleware/upload');

router.post('/register', requireFields(['name', 'phone', 'password', 'verificationChannel']), register);
router.post('/verify-registration', requireFields(['phone', 'code']), verifyRegistration);
router.post('/resend-verification', requireFields(['phone']), resendVerificationCode);
router.post('/login', requireFields(['password']), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/photo', protect, upload.single('profilePhoto'), uploadProfilePhoto);
router.put('/profile/pharmacist', protect, updatePharmacistDetails);
router.delete('/profile/pharmacist', protect, removePharmacistDetails);
router.post('/upload-pharmacist-photo', protect, upload.single('pharmacistPhoto'), uploadPharmacistPhoto);
router.post('/upload-pharmacy-image', upload.single('pharmacyImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid format. Images/PDFs only.' });
    }
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;
    const base64Data = fileBuffer.toString('base64');
    const base64Url = `data:${mimeType};base64,${base64Data}`;

    // Clean up local temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error('Error deleting temp file:', err);
    }

    res.status(200).json({ filePath: base64Url });
  } catch (error) {
    if (req.file && req.file.path) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
