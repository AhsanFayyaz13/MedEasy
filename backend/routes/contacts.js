const express = require('express');
const router = express.Router();
const { submitContactMessage } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');

router.route('/')
  .post(protect, submitContactMessage);

module.exports = router;
