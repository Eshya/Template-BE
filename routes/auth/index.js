const express = require('express');
const router = express.Router();
const passport = require('../../passport');

const moment = require('moment');
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('../../passport/secret');

const loginCtrl = (req, res, next) => {
    const origin = req.get('origin');
    console.log('---origin---');
    console.log(origin);
    console.log('---origin---');
    const user = req.user;
    user.expireAt = moment().add(12, req.body.rememberMe ? 'd' : 'h');
    const token = jwt.sign(user.toJSON(), JWT_SECRET);
    res.json({token, user});
}

const logoutCtrl = (req, res, next) => {
    Promise.all([req.logout(), res.clearCookie('conect.sid')])
    .then(() => {
        res.json({message: 'Logged out!'});
    }, (err) => next(err));
}

const auth = passport.authenticate('basic', {failureRedirect: '/login'});
router.post('/login', auth, loginCtrl);
router.get('logout', logoutCtrl);
module.exports = router;