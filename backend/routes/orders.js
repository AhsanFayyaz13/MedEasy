const express = require('express');
const ctrl = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParam, orders: v } = require('../validators');

const router = express.Router();

router
  .route('/')
  .post(protect, authorizeRoles('patient'), validate({ body: v.place }), ctrl.placeOrder)
  .get(protect, ctrl.getMyOrders);

router.get('/all', protect, authorizeRoles('pharmacist', 'admin'), validate({ query: v.listAll }), ctrl.getAllOrders);

router
  .route('/:id')
  .get(protect, validate({ params: idParam }), ctrl.getOrderById)
  .delete(protect, validate({ params: idParam, body: v.cancel }), ctrl.cancelOrder);

router.put('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), validate({ params: idParam, body: v.status }), ctrl.updateOrderStatus);

module.exports = router;
