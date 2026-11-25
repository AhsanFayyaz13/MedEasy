const express = require('express');
const { submitContactMessage } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { uploadLimiter } = require('../middleware/security');
const { contact } = require('../validators');

const router = express.Router();

router.post('/', protect, uploadLimiter, validate({ body: contact }), submitContactMessage);

module.exports = router;
