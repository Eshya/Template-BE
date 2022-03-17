const express = require('express');
const { auth, queryCek, paramCek, schemaCek, after } = require('../../helpers');
const router = express.Router();
const c = require('./kemitraan.controller');
const { schema } = require('./kemitraan.validation');

router.get('/', auth, queryCek, c.findAll)
router.get('/:id', auth, paramCek, c.findById)
router.get('/kandang/:id', auth, paramCek, c.getKandangPeriode)
router.post('/', auth, schemaCek(schema), after, c.insert)
router.put('/:id', auth, schemaCek(schema), after, c.updateById)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router;