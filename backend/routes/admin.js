const express = require('express');
const router = express.Router();
const {
  salesReport,
  inventoryReport,
  userStats,
  prescriptionAnalytics,
  listPendingProfessionals,
  approveProfessional,
  declineProfessional,
  listAllUsers,
  createAdminUser,
  toggleUserStatus,
  deleteUser,
  updateUserRole
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/sales', salesReport);
router.get('/inventory', inventoryReport);
router.get('/users', userStats);
router.get('/prescriptions/analytics', prescriptionAnalytics);

router.get('/users/all', listAllUsers);
router.post('/users', createAdminUser);
router.put('/users/:id/status', toggleUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/users/pending', listPendingProfessionals);
router.put('/users/:id/approve', approveProfessional);
router.put('/users/:id/decline', declineProfessional);

module.exports = router;
