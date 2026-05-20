const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

router.post('/register', requireFields(['name','email','password']), register);
router.post('/login', requireFields(['email','password']), login);
router.get('/profile', protect, getProfile);

module.exports = router;
