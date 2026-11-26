const express = require('express');
const ctrl = require('../controllers/prescriptionController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter, pollLimiter, messageLimiter } = require('../middleware/security');
const { upload } = require('../middleware/upload');
const { idParam, prescriptions: v, messages: m } = require('../validators');

const router = express.Router();

router.get('/', protect, validate({ query: v.list }), ctrl.getPrescriptions);
router.post(
  '/upload',
  protect,
  authorizeRoles('patient'),
  uploadLimiter,
  upload.single('prescription'),
  validate({ body: v.upload }),
  ctrl.uploadPrescription
);
// A doctor's prescription from a completed MedEasy consultation, sent to the pharmacy.
router.post('/from-appointment/:appointmentId', protect, authorizeRoles('patient'), uploadLimiter, validate({ params: v.appointmentParam }), ctrl.fromAppointment);
router.get('/:id/file', protect, authorizeRoles('patient', 'pharmacist', 'pharmacy', 'admin'), validate({ params: idParam }), ctrl.getPrescriptionFile);
router.delete('/:id', protect, authorizeRoles('patient'), validate({ params: idParam }), ctrl.deletePrescription);
router.put('/:id/verify', protect, authorizeRoles('pharmacist', 'admin'), validate({ params: idParam, body: v.verify }), ctrl.verifyPrescription);

// The pharmacy's offer: what it can supply from the prescription. The patient accepts or declines it.
router.put('/:id/offer', protect, authorizeRoles('pharmacist', 'admin'), validate({ params: idParam, body: v.offer }), ctrl.sendOffer);
router.post('/:id/offer/accept', protect, authorizeRoles('patient'), validate({ params: idParam, body: v.accept }), ctrl.acceptOffer);
router.post('/:id/offer/decline', protect, authorizeRoles('patient'), validate({ params: idParam }), ctrl.declineOffer);

// Conversation between the patient and the pharmacy about this prescription.
router
  .route('/:id/messages')
  .get(protect, pollLimiter, validate({ params: idParam, query: m.list }), ctrl.listMessages)
  .post(protect, messageLimiter, validate({ params: idParam, body: m.send }), ctrl.sendMessage);

module.exports = router;
