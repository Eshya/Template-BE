const express = require('express');
const router = express.Router();
const c = require('./nekropsi.controller');
const {schema} = require('./nekropsi.validation')
const {auth, queryCek, schemaCek, paramCek, after, permition, permitionPPL} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, auth, permition('superadmin', 'peternak', 'ppl'), schemaCek(schema), after, c.insert);
router.put('/:id', auth, auth, permition('superadmin', 'peternak', 'ppl'), paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, auth, permition('superadmin', 'peternak', 'ppl'), paramCek, c.removeById);

module.exports = router;