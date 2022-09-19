const express = require('express');
const router = express.Router();
const c = require('./budidaya.controller');
const {auth, queryCek} = require('../../helpers');

router.get('/riwayat/:id', auth, queryCek, c.riwayatBudidaya);
module.exports = router;