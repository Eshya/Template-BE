const express = require('express');
const router = express.Router();
const c = require('./absensi.controller');
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
// router.get('/count', queryCek, c.count);
// router.get('/sisaAyam/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findSisaAyam);
router.get('/ppl/history', auth, queryCek,permitionPPL, c.findById);
router.get('/ppl/history-today', auth, queryCek,permitionPPL, c.findToday);
router.get('/ppl/kandang', auth, queryCek,permitionPPL, c.findKandang);
router.get('/ppl/today', auth, queryCek, c.findPPLNotAttend);
router.get('/ppl', auth, paramCek,permitionPPL, c.findIsAbsent);
router.post('/ppl', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, after, c.insert);
// router.put('/ppl', auth, c.updateWhere);
// router.put('/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.updateById);
// router.delete('/', auth, c.remove);
router.delete('/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.removeById);

module.exports = router