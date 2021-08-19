const express = require('express');
const { auth } = require('../../helpers');
const router = express.Router();
const c = require('./iot-kandang.controller')

router.get('/', auth, c.findByKandang);
router.post('/', auth, c.insert);

module.exports = router;