const express = require('express');
const router = express.Router();
const c = require('./rhpp.controller');
const {auth, queryCek} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.post('/upload/:id', auth, c.uploadRHPP);
router.get('/download/:id', c.downloadRHPP);
router.get('/delete/:id', c.deleteRHPP);

module.exports = router;