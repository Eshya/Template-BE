const createError = require('http-errors');
const {parse} = require('./query.parser');
const {param, query, after} = require('./request.validation');
const {checkSchema} = require('express-validator');
const passport = require('passport');
const {JWT_SECRET} = require('../../passport/secret')
const jwt = require('jsonwebtoken')
const {permit, permitPPL} = require('./permition')
const {arrSkip, arrLimit} = require('./custom.helper')

// exports.auth = passport.authenticate('jwt', {session: false});
// exports.arrGroup = arrGroup
exports.arrLimit = arrLimit
exports.arrSkip = arrSkip
exports.permition = permit
exports.permitionPPL = permitPPL
exports.schemaCek = checkSchema;
exports.after = after;
exports.queryCek = query;
exports.parseQuery = parse;
exports.paramCek = param;
exports.createError = createError;
exports.projectName = process.env.npm_package_name;
exports.isDevMode = process.env.NODE_ENV === 'development';
exports.apiKey = 
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

const verifyKey = async (req, res, next) => {
  const apiKey = !req.query.apiKey ? req.headers['apikey'] : req.query.apiKey
  console.log(apiKey)
  if (!apiKey || apiKey !== "74e48c8e3c0bc19f9e22dd7570037392e5d0bf80cf9dd51") return res.json({error: 401, message: "unathorized"})
  next()
}

exports.verifyApiKey = verifyKey
exports.auth = verifyToken