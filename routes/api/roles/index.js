const express = require('express');
const router = express.Router();
const c = require('./roles.controller');
const {schema} = require('./roles.validation')
const {queryCek, schemaCek, paramCek, after} = require('../../helpers')

router.get('/', queryCek, c.findAll);
router.get('/count', queryCek, c.count);
router.get('/:id', paramCek, c.findById);
router.post('/', schemaCek(schema), after, c.insert);
router.put('/:id', paramCek, c.updateById);
router.put('/', c.updateWhere);
router.delete('/', c.remove);
router.delete('/:id', paramCek, c.removeById);

module.exports = router;