const express = require('express');
const router = express.Router();
const {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  uploadMedicinePhoto
} = require('../controllers/medicineController');
const { protect, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload-photo', protect, authorizeRoles('pharmacist', 'admin'), upload.single('medicinePhoto'), uploadMedicinePhoto);

router.route('/')
  .get(getAllMedicines)
  .post(protect, authorizeRoles('pharmacist', 'admin'), createMedicine);

router.route('/:id')
  .get(getMedicineById)
  .put(protect, authorizeRoles('pharmacist', 'admin'), updateMedicine)
  .delete(protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
