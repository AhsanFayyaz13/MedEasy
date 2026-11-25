const express = require('express');
const ctrl = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam, admin: v } = require('../validators');

const router = express.Router();

// Every admin route requires an authenticated admin.
router.use(protect, authorizeRoles('admin'));

router.get('/sales', ctrl.salesReport);
router.get('/inventory', ctrl.inventoryReport);
router.get('/users', ctrl.userStats);
router.get('/prescriptions/analytics', ctrl.prescriptionAnalytics);

router.get('/users/all', ctrl.listAllUsers);
router.get('/users/pending', ctrl.listPendingProfessionals);
router.post('/users', validate({ body: v.createUser }), ctrl.createAdminUser);
router.put('/users/:id/status', validate({ params: idParam }), ctrl.toggleUserStatus);
router.put('/users/:id/role', validate({ params: idParam, body: v.role }), ctrl.updateUserRole);
router.put('/users/:id/approve', validate({ params: idParam }), ctrl.approveProfessional);
router.put('/users/:id/decline', validate({ params: idParam, body: v.decline }), ctrl.declineProfessional);
router.delete('/users/:id', validate({ params: idParam }), ctrl.deleteUser);

module.exports = router;
