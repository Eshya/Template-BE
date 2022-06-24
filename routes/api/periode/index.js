const express = require('express');
const router = express.Router();
const c = require('./periode.controller');
const {schema} = require('./periode.validation');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll);
// router.get('/public', queryCek, c.findPublic);
router.get('/age/:id', paramCek, c.umurAyam);
router.get('/performa', auth, queryCek, c.performa)
router.get('/count', queryCek, c.count);
router.get('/ringkasan/:id', auth, paramCek, c.ringkasan)
router.get('/end/:id', auth, paramCek, c.endPeriode);
router.get('/kegiatan/:id', auth, paramCek, c.findKegiatan);
router.get('/nekropsi/:id', auth, paramCek, c.findNekropsi);
router.get('/penjualan/:id', auth, paramCek, c.findPenjualan);
router.get('/sapronak/:id', auth, paramCek, c.findSapronak);
router.get('/budidaya/:id', auth, paramCek, c.getBudidaya);
router.get('/:id', auth, paramCek, c.findById);
router.post('/validate', auth, c.validateTambah)
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/tambah/ppl/:id', auth, paramCek, c.tambahPPL)
router.put('/hapus/ppl/:id', auth, paramCek, c.hapusPPL)
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;

