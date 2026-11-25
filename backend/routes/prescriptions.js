const express = require('express');
const ctrl = require('../controllers/prescriptionController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/security');
const { upload } = require('../middleware/upload');
const { idParam, prescriptions: v } = require('../validators');

const router = express.Router();

router.get('/', protect, ctrl.getPrescriptions);
router.post(
  '/upload',
  protect,
  authorizeRoles('patient'),
  uploadLimiter,
  upload.single('prescription'),
  validate({ body: v.upload }),
  ctrl.uploadPrescription
);
router.delete('/:id', protect, authorizeRoles('patient'), validate({ params: idParam }), ctrl.deletePrescription);
router.put('/:id/verify', protect, authorizeRoles('pharmacist', 'admin'), validate({ params: idParam, body: v.verify }), ctrl.verifyPrescription);

module.exports = router;
