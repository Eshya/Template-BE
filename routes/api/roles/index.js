const express = require('express');
const router = express.Router();
const c = require('./roles.controller');
const {schema} = require('./roles.validation')
const {queryCek, schemaCek, paramCek, after} = require('../../helpers')

router.get('/', queryCek, c.findAll);

module.exports = router;