const express = require('express');
const ctrl = require('../controllers/medicineController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/security');
const { imageUpload } = require('../middleware/upload');
const { idParam, medicines: v } = require('../validators');

const router = express.Router();
const staff = [protect, authorizeRoles('pharmacist', 'admin')];

router.post('/upload-photo', ...staff, uploadLimiter, imageUpload.single('medicinePhoto'), ctrl.uploadMedicinePhoto);

router
  .route('/')
  .get(validate({ query: v.list }), ctrl.getAllMedicines)
  .post(...staff, validate({ body: v.create }), ctrl.createMedicine);

router
  .route('/:id')
  .get(validate({ params: idParam }), ctrl.getMedicineById)
  .put(...staff, validate({ params: idParam, body: v.update }), ctrl.updateMedicine)
  .delete(protect, authorizeRoles('admin'), validate({ params: idParam }), ctrl.deleteMedicine);

module.exports = router;
