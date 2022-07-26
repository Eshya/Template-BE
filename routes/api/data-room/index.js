const express = require('express')
const router = express.Router()
const c = require('./data-room.controller')
const {schema} = require('./data-room.validation')
const { auth, queryCek, schemaCek, paramCek, after, verifyApiKey } = require('../../helpers')

router.get('/', verifyApiKey, queryCek, c.findAll),
router.get('/date', verifyApiKey, queryCek, c.findByDate)
router.get('/', auth, queryCek, c.count)
router.get('/:id', auth, paramCek, c.findById)
router.get('/department/:department', verifyApiKey, paramCek, c.findByDepartment)
router.post('/', auth, after, schemaCek(schema), c.insert)
router.put('/', auth, c.updateWhere)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/', auth, c.remove)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router