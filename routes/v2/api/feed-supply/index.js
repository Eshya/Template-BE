const express = require('express')
const router = express.Router()
const c = require('./ovk-supply.controller')
const {schema} = require('./ovk-supply.validation')
const { auth, queryCek, schemaCek, paramCek, after } = require('../../../helpers')
const { queryCek } = require('../../../helpers')

router.get('/', auth, queryCek, c.findAll),
router.get('/', auth, queryCek, c.count)
router.get('/:id', auth, paramCek, c.findById)
router.post('/', auth, after, schemaCek(schema), c.insert)
router.put('/', auth, c.updateWhere)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/', auth, c.remove)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router