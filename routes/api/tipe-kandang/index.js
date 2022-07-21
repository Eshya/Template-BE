const express = require('express');
const router = express.Router();
const c = require('./tipe-kandang.controller');
const {schema} = require('./tipe-kandang.validation')
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL} = require('../../helpers')
const all = permition('superadmin', 'ppl', 'peternak', 'adminsales', 'adminkemitraan', 'adminiot')

router.get('/', auth, all, permitionPPL, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;