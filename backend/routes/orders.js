const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.route('/')
  .post(protect, placeOrder)
  .get(protect, getMyOrders);

router.route('/all')
  .get(protect, authorizeRoles('pharmacist', 'admin'), require('../controllers/orderController').getAllOrders);

router.route('/:id')
  .get(protect, getOrderById)
  .delete(protect, cancelOrder);

router.route('/:id/status')
  .put(protect, authorizeRoles('pharmacist', 'admin'), updateOrderStatus);

module.exports = router;
