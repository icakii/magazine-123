const express = require('express');
const { register, login, setup2FA, enable2FA, verify2FA, logout } = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);
router.post('/logout', authRequired, logout);
router.get('/2fa/setup', authRequired, setup2FA);
router.post('/2fa/enable', authRequired, enable2FA);

module.exports = router;
