const express = require('express');
const router = express.Router();
const c = require('./penjualan.controller');
const {schema} = require('./penjualan.validation')
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, schemaCek(schema), after, c.insert);
router.put('/:id', auth, auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, auth, permition('superadmin', 'peternak', 'ppl'), paramCek, c.removeById);

module.exports = router;