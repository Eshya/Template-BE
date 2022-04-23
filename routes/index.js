const express = require('express');
const router = express.Router();

router.use('/api', require('./api'));
// router.use('/api/v2', require('./v2/api'))
// router.use('/auth', require('./auth'));

module.exports = router;
