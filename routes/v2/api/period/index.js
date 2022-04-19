const express = require('express')
const router = express.Router()
const c = require('./period.controller')
const {schema} = require('./period.validation')
const { auth, queryCek, schemaCek, paramCek, after } = require('../../../helpers')
const { queryCek } = require('../../../helpers')

router.get('/', auth, queryCek, c.findAll),
router.get('/', auth, queryCek, c.count)
router.get('/:id', auth, paramCek, c.findById)
router.get('/deact/:id', auth, paramcek, c.deactivation)
router.post('/', auth, after, schemaCek(schema), c.insert)
router.post('/actv', auth, after, schemaCek(schema), c.activation)
router.put('/', auth, c.updateWhere)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/', auth, c.remove)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router