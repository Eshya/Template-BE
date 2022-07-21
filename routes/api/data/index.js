const express = require('express');
const { auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL } = require('../../helpers');
const router = express.Router();
const c = require('./data.controller');
const { schema } = require('./data.validation');

router.get('/', auth, queryCek, c.findAll);
router.get('/data-pool', auth, queryCek, c.findAllDataPool);
router.get('/day', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.findByDay);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/data-pool', auth, c.updateDataPool);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;