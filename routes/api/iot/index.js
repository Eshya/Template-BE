const express = require('express');
const router = express.Router();
const c = require('./iot.controller')

router.get('/info', c.findUser);
router.get('/user', c.findByUser);
router.get('/:id', c.findById);
router.put('/:id', c.update);
router.delete('/:id', c.delete);

module.exports = router;