const express = require('express');
const ctrl = require('../controllers/orderController');
const { protect, optionalAuth, authorizeRoles } = require('../middleware/auth');
const { guestOrderLimiter } = require('../middleware/security');
const { validate } = require('../middleware/validate');
const { idParam, orders: v } = require('../validators');

const router = express.Router();

router
  .route('/')
  // Signed-in patients, or guests buying OTC medicines (no account).
  .post(optionalAuth, guestOrderLimiter, validate({ body: v.place }), ctrl.placeOrder)
  .get(protect, ctrl.getMyOrders);

// Guests: look up / cancel an order with its order number and the phone used at checkout.
router.post('/track', guestOrderLimiter, validate({ body: v.track }), ctrl.trackOrder);
router.post('/track/cancel', guestOrderLimiter, validate({ body: v.track }), ctrl.cancelTrackedOrder);

router.get('/all', protect, authorizeRoles('pharmacist', 'admin'), validate({ query: v.listAll }), ctrl.getAllOrders);

router
  .route('/:id')
  .get(protect, validate({ params: idParam }), ctrl.getOrderById)
  .delete(protect, validate({ params: idParam, body: v.cancel }), ctrl.cancelOrder);

router.put('/:id/status', protect, authorizeRoles('pharmacist', 'admin'), validate({ params: idParam, body: v.status }), ctrl.updateOrderStatus);

module.exports = router;
