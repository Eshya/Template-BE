const express = require('express');
const { auth, queryCek, schemaCek, paramCek, after } = require('../../helpers');
const router = express.Router();
const c = require('./data.controller');
const { schema } = require('./data.model');

router.get('/', auth, queryCek, c.findAll);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;