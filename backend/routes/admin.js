const express = require('express');
const router = express.Router();
const {
  salesReport,
  inventoryReport,
  userStats,
  prescriptionAnalytics
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Apply middleware to all routes in this file
router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/sales', salesReport);
router.get('/inventory', inventoryReport);
router.get('/users', userStats);
router.get('/prescriptions/analytics', prescriptionAnalytics);

module.exports = router;
