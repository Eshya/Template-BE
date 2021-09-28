const express = require('express');
const { auth, queryCek, schemaCek, paramCek, after } = require('../../helpers');
const router = express.Router();
const c = require('./data.controller');
const { schema } = require('./data.model');

router.get('/', auth, queryCek, c.findAll);

module.exports = router;