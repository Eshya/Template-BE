const express = require('express');
const router = express.Router();
const c = require('./notification.controller');

router.post('/example', c.example);

module.exports = router;