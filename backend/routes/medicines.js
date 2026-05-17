const express = require('express');
const router = express.Router();
const {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine
} = require('../controllers/medicineController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.route('/')
  .get(getAllMedicines)
  .post(protect, authorizeRoles('pharmacist', 'admin'), createMedicine);

router.route('/:id')
  .get(getMedicineById)
  .put(protect, authorizeRoles('pharmacist', 'admin'), updateMedicine)
  .delete(protect, authorizeRoles('admin'), deleteMedicine);

module.exports = router;
