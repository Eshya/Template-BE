const express = require('express');
const router = express.Router();
const c = require('./dashboard.controller');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/getKelola', auth, queryCek, c.getKelola);

module.exports = router;