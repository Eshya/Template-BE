const express = require('express');
const router = express.Router();
const c = require('./ppl.controller');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll)
router.get('/:id', auth, queryCek, c.findById);
router.put('/remove/:id', auth, after, c.removePPLById)

module.exports = router;