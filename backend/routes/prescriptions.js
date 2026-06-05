const express = require('express');
const router = express.Router();
const {
  uploadPrescription,
  getPrescriptions,
  verifyPrescription,
  deletePrescription
} = require('../controllers/prescriptionController');
const { protect, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getPrescriptions);

router.route('/upload')
  .post(protect, authorizeRoles('patient'), upload.single('prescription'), uploadPrescription);

router.route('/:id')
  .delete(protect, authorizeRoles('patient'), deletePrescription);

router.route('/:id/verify')
  .put(protect, authorizeRoles('pharmacist', 'admin'), verifyPrescription);

module.exports = router;
