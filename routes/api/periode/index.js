const express = require('express');
const router = express.Router();
const c = require('./periode.controller');
const {schema} = require('./periode.validation');
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL, verifyKey, verifyApiKey} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll);
// router.get('/public', queryCek, c.findPublic);
router.get('/age/:id', paramCek, c.umurAyam);
router.get('/performa', auth, queryCek, c.performa)
router.get('/count', queryCek, c.count);
router.get('/ringkasan/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.ringkasan)
router.get('/end/:id', auth, permition('superadmin', 'peternak', 'ppl'), paramCek, c.endPeriode);
router.get('/kegiatan/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findKegiatan);
router.get('/nekropsi/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findNekropsi);
router.get('/penjualan/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findPenjualan);
router.get('/sapronak/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findSapronak);
router.get('/budidaya/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.getBudidaya);
router.get('/:id', auth, paramCek, c.findById);
router.get('/chart/deplesi/:id', auth, c.deplesiChart);
router.get('/chart/feedIntake/:id', auth, c.feedIntakeChart);
router.post('/validate', auth, permition('superadmin', 'ppl'), permitionPPL, c.validateTambah)
router.post('/', auth, schemaCek(schema), after, c.insert);
// router.post('/autoClosingCultivate', verifyApiKey, c.autoClosingCultivation );
router.put('/tambah/ppl/:id', auth, permition('superadmin', 'ppl'), permitionPPL, paramCek, c.tambahPPL)
router.put('/hapus/ppl/:id', auth, permition('superadmin', 'ppl'), permitionPPL, paramCek, c.hapusPPL)
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);
router.post('/script/reActivateChickenSheds', c.reActivateChickenSheds);
module.exports = router;

