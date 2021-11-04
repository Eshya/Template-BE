const express = require('express');
const {auth, parseQuery, schemaCek, paramCek, after, queryCek} = require('../../helpers')
const router = express.Router();
const c = require('./call-us.controller');
const {schema} = require('./call-us.validation');

router.get('/', auth, queryCek, c.findAll)
router.get('/:id', auth, paramCek, c.findById)
router.post('/', auth, schemaCek(schema), after, c.insert)
router.put('/:id', auth, paramCek, c.updateById)
router.delete('/:id', auth, paramCek, c.removeById)
router.delete('/', auth, c.remove)

module.exports = router;