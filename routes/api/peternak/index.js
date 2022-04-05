const express = require('express');
const router = express.Router();
const c = require('./peternak.controller');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll)
router.get('/:id', auth, queryCek, c.findById);

module.exports = router;