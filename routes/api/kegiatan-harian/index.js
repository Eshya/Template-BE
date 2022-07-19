const express = require('express');
const router = express.Router();
const c = require('./kegiatan-harian.controller');
const {schema} = require('./kegiatan-harian.validation');
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/count', queryCek, c.count);
router.get('/sisaAyam/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findSisaAyam);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, schemaCek(schema), after, c.insert);
router.put('/', auth, c.updateWhere);
router.put('/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.updateById);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.removeById);

module.exports = router;