const express = require('express');
const router = express.Router();
const c = require('./users.controller');
const {schema} = require('./users.validation');
const {auth, queryCek, schemaCek, paramCek, after} = require('../../helpers');

router.get('/', auth, queryCek, c.findAll);
// router.get('/public', queryCek, c.findPublic);
router.get('/kelola', auth, paramCek, c.findPeriode);
router.get('/count', queryCek, c.count);
router.get('/:id', auth, paramCek, c.findById);
router.get('/kandang/:id', auth, paramCek, c.findKandang);
router.post('/', auth, schemaCek(schema), after, c.insert);
router.post('/signup', schemaCek(schema), after, c.register);
router.post('/validation', schemaCek(schema), after, c.validationSignup);
router.put('/kelola', auth, c.kelolaPeriode);
router.put('/:id', auth, paramCek, c.updateById);
router.put('/', auth, c.updateWhere);
router.delete('/:id', auth, paramCek, c.removeById);
router.delete('/', auth, c.remove);
router.post('/reset-password/:token', c.resetPassword)
router.post('/forgot', c.forgetPassword)
router.get('/reset/:token', c.getToken)

module.exports = router;