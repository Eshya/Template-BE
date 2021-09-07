const express = require('express');
const { auth } = require('../../helpers');
const router = express.Router();
const c = require('./iot-kandang.controller')

router.get('/:id', auth, c.findByKandang);
router.post('/', auth, c.insert);
router.delete('/:id', auth, c.removeById);

module.exports = router;