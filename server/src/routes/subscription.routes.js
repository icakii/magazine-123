const express = require('express');
const { createSubscription, getMySubscriptions } = require('../controllers/subscription.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authRequired, createSubscription);
router.get('/', authRequired, getMySubscriptions);

module.exports = router;
