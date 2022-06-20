const express = require('express');
const router = express.Router();
const c = require('./kandang.controller');
const {schema} = require('./kandang.validation');
const {auth, queryCek, schemaCek, paramCek, after, permition} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll);
router.get('/data-pool', auth, queryCek, c.findAllDataPool);
router.get('/data-pool/:id', auth, queryCek, c.findOneDataPool);
router.get('/data-pool/export/:id', auth, queryCek, c.exportDataPool);
router.get('/active', auth, queryCek, c.findActive);
router.get('/populasi/:id', auth, paramCek, c.countPopulasi);
router.get('/list/peternak', auth, permition('superadmin', 'peternak'), queryCek, c.listKandangPeternak)
router.get('/list/ppl', auth, permition('superadmin', 'ppl'), queryCek, c.listKandangPPL)
router.get('/kelola/peternak', auth, permition('superadmin', 'peternak'), queryCek, c.kelolaPeternak)
router.get('/kelola/ppl', auth, permition('superadmin', 'ppl'), queryCek, c.kelolaPPL)
// router.get('/public', queryCek, c.findPublic);
router.get('/count', queryCek, c.count);
router.get('/user', auth, queryCek, c.findByUser);
router.get('/dashboard/getKelola', auth, queryCek, c.getKelola);
// router.get('/flock/:id', auth, paramCek, c.findFlock);
router.get('/periode/:id', auth, paramCek, c.findPeriode);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/', auth, c.updateWhere);
router.put('/:id', auth, paramCek, c.updateById);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;