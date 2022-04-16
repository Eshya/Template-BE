const express = require('express');
const router = express.Router();
const c = require('./province.controller');
const {auth, queryCek, paramCek} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);

module.exports = router;