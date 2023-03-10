const express = require('express');
const router = express.Router();
const c = require('./data-penyakit.controller');
const {schema} = require('./data-penyakit.validation')
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;