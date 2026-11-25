const express = require('express');
const { submitContactMessage } = require('../controllers/contactController');
const { optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/security');
const { contact } = require('../validators');

const router = express.Router();

// Public: visitors can ask questions before creating an account (rate limited).
router.post('/', optionalAuth, uploadLimiter, validate({ body: contact }), submitContactMessage);

module.exports = router;
