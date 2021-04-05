const createError = require('http-errors');
const {parse} = require('./query.parser');
const {param, query, after} = require('./request.validation');
const {checkSchema} = require('express-validator');

exports.schemaCek = checkSchema;
exports.after = after;
exports.queryCek = query;
exports.parseQuery = parse;
exports.paramCek = param;
exports.createError = createError;
exports.projectName = process.env.npm_package_name;