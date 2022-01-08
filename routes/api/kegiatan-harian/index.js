const express = require('express');
const router = express.Router();
const c = require('./kegiatan-harian.controller');
const {schema} = require('./kegiatan-harian.validation');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
// router.get('/public', queryCek, c.findPublic);
router.get('/count', queryCek, c.count);
router.get('/sisaAyam/:id', auth, paramCek, c.findSisaAyam);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
// router.post('/validation', auth, after, c.cekKuantitas);
// router.get('/ins', auth, c.insert)
router.put('/', auth, c.updateWhere);
router.put('/:id', auth, paramCek, c.updateById);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;