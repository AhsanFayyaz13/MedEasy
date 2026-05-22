const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  uploadProfilePhoto,
  verifyRegistration, 
  resendVerificationCode 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const upload = require('../middleware/upload');

router.post('/register', requireFields(['name', 'phone', 'password', 'verificationChannel']), register);
router.post('/verify-registration', requireFields(['phone', 'code']), verifyRegistration);
router.post('/resend-verification', requireFields(['phone']), resendVerificationCode);
router.post('/login', requireFields(['password']), login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile/photo', protect, upload.single('profilePhoto'), uploadProfilePhoto);

module.exports = router;
