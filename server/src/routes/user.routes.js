const express = require('express');
const { me } = require('../controllers/user.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = express.Router();
router.get('/me', authRequired, me);

module.exports = router;
