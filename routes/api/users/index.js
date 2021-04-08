const express = require('express');
const router = express.Router();
const c = require('./users.controller');
const {schema} = require('./users.validation');
const {queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', queryCek, c.findAll);
router.get('/public', queryCek, c.findPublic);
router.get('/count', queryCek, c.count);
router.get('/:id', paramCek, c.findById);
router.post('/', schemaCek(schema), after, c.insert);
router.put('/:id', paramCek, c.updateById);
router.put('/', c.updateWhere);
router.delete('/:id', paramCek, c.remove);
router.delete('/', c,remove);

module.exports = router;