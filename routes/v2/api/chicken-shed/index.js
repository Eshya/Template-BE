const express = require('express')
const router = express.Router()
const c = require('./chicken-shed.controller')
const {schema} = require('./chicken-shed.validation')
const { auth, paramCek, queryCek, after, schemaCek } = require('../../../helpers')

router.get('/', auth, queryCek, c.findAll)
router.get('/', auth, queryCek, c.count)
router.get('/active', auth, queryCek, c.findActive) //dashboard screen
router.get('/inactive', auth, queryCek, c.findInactive) //dashboard screen
router.get('/:id', auth, paramCek, c.findById)
router.post('/', auth, after, schemaCek(schema), c.insert)
router.put('/', auth, c.updateWhere)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/', auth, c.remove)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router;
