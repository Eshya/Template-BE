const createError = require('http-errors');
const {parse} = require('./query.parser');
const {param, query, after} = require('./request.validation');
const {checkSchema} = require('express-validator');
const passport = require('passport');
const {JWT_SECRET} = require('../../passport/secret')
const jwt = require('jsonwebtoken')
const {permit} = require('./permition')

// exports.auth = passport.authenticate('jwt', {session: false});
exports.permition = permit
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

const verifyToken = async (req, res, next) => {
  try {
      const token = req.headers['authorization']
      if(!token) return res.status(401).json('Unauthorize')
      const decode = await jwt.verify(token.split(' ')[1], JWT_SECRET)
      req.user = decode
      next()
  } catch (error) {
    next(error)
  }
}

exports.auth = verifyToken