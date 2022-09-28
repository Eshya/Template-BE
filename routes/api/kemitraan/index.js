const express = require('express');
const { auth, queryCek, paramCek, schemaCek, after, permition, permitionPPL } = require('../../helpers');
const router = express.Router();
const c = require('./kemitraan.controller');
const { schema } = require('./kemitraan.validation');

const all = permition('superadmin', 'ppl', 'peternak', 'adminsales', 'adminkemitraan', 'adminiot','adminaftersales')

router.get('/', auth, all, permitionPPL, queryCek, c.findAll)
router.get('/:id', auth, paramCek, c.findById)
router.get('/kandang/:id', auth, paramCek, c.getKandangPeriode)
router.post('/', auth, schemaCek(schema), after, c.insert)
router.put('/:id', auth, schemaCek(schema), after, c.updateById)
router.put('/remove/:id', auth, after, c.removeKemitraanById)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router;