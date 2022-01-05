const express = require('express');
const router = express.Router();
const c = require('./faq.controller');
const {schema} = require('./faq.validation')
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers')

router.get('/', auth, queryCek, c.findAll);
router.get('/count', auth, queryCek, c.count);
router.get('/:id', auth, paramCek, c.findById);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/', auth, c.remove);
router.delete('/:id', auth, paramCek, c.removeById);

module.exports = router;
