const express = require('express')
const { auth, after, queryCek, paramCek, schemaCek, permition, permitionPPL } = require("../../helpers");
const router = express.Router()
const c = require('./absensi-image.controller')
const {schema} = require('./absensi-image.validation')

router.get('/', auth, queryCek, c.findAll)
router.get('/:id', auth, paramCek, c.findById)
router.post('/', auth, schemaCek(schema), after, c.insert)
router.post('/upload', auth, permition('superadmin', 'peternak', 'ppl'), permitionPPL, c.upload)
router.put('/:id', auth ,paramCek, c.updateById)
router.put('/', auth, c.updateWhere)
router.delete('/', auth, c.remove)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router