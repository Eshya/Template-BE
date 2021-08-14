const createError = require('http-errors');
const {parse} = require('./query.parser');
const {param, query, after} = require('./request.validation');
const {checkSchema} = require('express-validator');
const passport = require('passport');

exports.auth = passport.authenticate('jwt', {session: false});
exports.schemaCek = checkSchema;
exports.after = after;
exports.queryCek = query;
exports.parseQuery = parse;
exports.paramCek = param;
exports.createError = createError;
exports.projectName = process.env.npm_package_name;
exports.isDevMode = process.env.NODE_ENV === 'development';
exports.fname = (fname) => {
    const splited = fname.split('/');
    return splited[splited.length-1];
}
exports.getOffset = (currentPage = 1, listPerPage) => {
    return (currentPage - 1) * [listPerPage];
  }
  
exports.emptyOrRows = (rows) => {
    if(!rows) {
      return []
    } else {
      return rows
    }
}