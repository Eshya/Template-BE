const express = require('express')
const router = express.Router()
const c = require('./version.controller')
const {schema} = require('./version.validation')
const {auth, queryCek, schemaCek, after, paramCek} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll)
router.post('/', auth, schemaCek(schema), after, c.insert)
router.post('/cek', auth, c.checkVersion)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/:id', auth, paramCek, c.removeById)

module.exports = router;