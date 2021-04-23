const express = require('express');
const router = express.Router();
const c = require('./kandang.controller');
const {schema} = require('./kandang.validation');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll);
router.get('/active', auth, queryCek, c.findActive);
router.get('/populasi/:id', auth, paramCek, c.countPopulasi);
router.get('/public', queryCek, c.findPublic);
router.get('/count', queryCek, c.count);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/', auth, c.updateWhere);
router.put('/:id', auth, paramCek, c.updateById);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;