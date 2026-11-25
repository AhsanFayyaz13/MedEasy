const express = require('express');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authLimiter, uploadLimiter } = require('../middleware/security');
const { imageUpload, upload } = require('../middleware/upload');
const { auth: v } = require('../validators');

const router = express.Router();

// Public auth flows — strictly rate limited
router.post('/register', authLimiter, validate({ body: v.register }), ctrl.register);
router.post('/verify-registration', authLimiter, validate({ body: v.verifyRegistration }), ctrl.verifyRegistration);
router.post('/resend-verification', authLimiter, validate({ body: v.resend }), ctrl.resendVerificationCode);
router.post('/login', authLimiter, validate({ body: v.login }), ctrl.login);
router.post('/forgot-password', authLimiter, validate({ body: v.forgotPassword }), ctrl.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: v.resetPassword }), ctrl.resetPassword);

// Pharmacy storefront photo is uploaded *before* the account exists (registration step),
// so it stays public — but images only, small, and rate limited.
router.post('/upload-pharmacy-image', uploadLimiter, imageUpload.single('pharmacyImage'), ctrl.uploadPharmacyImage);

// Authenticated profile management
router.get('/profile', protect, ctrl.getProfile);
router.put('/profile', protect, validate({ body: v.updateProfile }), ctrl.updateProfile);
router.put('/password', protect, authLimiter, validate({ body: v.changePassword }), ctrl.changePassword);
router.post('/profile/photo', protect, uploadLimiter, imageUpload.single('profilePhoto'), ctrl.uploadProfilePhoto);
router.put('/profile/pharmacist', protect, validate({ body: v.pharmacistDetails }), ctrl.updatePharmacistDetails);
router.delete('/profile/pharmacist', protect, ctrl.removePharmacistDetails);
router.post('/upload-pharmacist-photo', protect, uploadLimiter, upload.single('pharmacistPhoto'), ctrl.uploadPharmacistPhoto);

module.exports = router;
