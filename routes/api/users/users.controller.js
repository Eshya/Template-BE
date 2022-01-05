const {parseQuery, createError, isDevMode} = require('../../helpers');
const Role = require('../roles/roles.model');
const Model = require('./users.model');
const selectPublic = '-createdAt -updatedAt -password';
const passwordHash = require('password-hash');
const Kandang = require('../kandang/kandang.model');
const Periode = require('../periode/periode.model')
const md5 = require('md5');
const bcrypt = require('bcrypt');
const db = require('../../../configs/db.conf');
const { create } = require('../roles/roles.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const mailOptions = {
    from: 'reset@chickin.com',
}

const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
<<<<<<< HEAD
      user: 'techinchickin@gmail.com',
      pass: 'gkljjxtuyvduhgsk',
=======
      user: 'wahono.gusty12@gmail.com',
      pass: '250499hap',
>>>>>>> 55717eb... reset-password
    }
})

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort);
    if(isPublic){
        data.select(selectPublic);
    }
    const results = await Promise.all([count, data]);
    return {length: results[0], data: results[1]};
}

const _beforeSave = (data) => {
    if(data.password){
        data.password = passwordHash.generate(data.password, {saltLength: 10});
    }
    if (!data.noKTP || !data.asalKemitraan){
        delete data.noKTP
        delete data.asalKemitraan
    }
    return data;
}

exports.findAll = async (req, res, next) => {
    try {
        const result = await _find(req, false);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

exports.findPublic = async (req, res, next) => {
    try {
        const result = await _find(req, true);
        res.json(result)
    } catch (error) {
        next(error);
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.countDocuments(where).exec();
        res.json({length: result});
    } catch (error) {
        next(error);
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.findKandang = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Kandang.find({createdBy: id})
        res.json({
            data: results,
            message: 'Ok'
        })   
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = _beforeSave(req.body);
    try {
        const result = await Model.create(data);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = _beforeSave(req.body)
    try {
        const result = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = _beforeSave(req.body);
    try {
        const result = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const result = await Model.deleteMany(where).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);   
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const result = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        
    }
}

//auth

exports.login = (username, password) => {
    return new Promise((resolve, reject) => {
        Model.findOne({username})
        .select('_id password username roles')
        .then((foundUser) => {
            if(!foundUser) return reject(createError(400, 'Username not found!'));
            const hashedPassword = foundUser.password;
            const isValidPassword = passwordHash.verify(password, hashedPassword);
            if(isValidPassword){
                resolve(foundUser);
            } else {
                reject(createError(400, 'Wrong Password'));
            }
        })
    })
}

exports.register = async (req, res, next) => {
    let {fullname, username, email, phoneNumber, password, noKTP, asalKemitraan, idFirebase} = _beforeSave(req.body);
    let result = []
    let mysql = []
    try {
        if(req.body.noKTP == null  && req.body.asalKemitraan == null){
            let role = await Role.findOne({name: 'peternak'}, {_id: true})
            const resultUser = await createUser({fullname, username, email, phoneNumber, password, role, idFirebase}, res)
            const resultMysql = await createNew(req.body)
            result.push(resultUser)
            mysql.push(resultMysql)
        } else {
            let role = await Role.findOne({name: 'ppl'}, {_id: true})
            const resultUser = await createUser({fullname, username, email, phoneNumber, password, noKTP, asalKemitraan, role, idFirebase}, res)
            const resultMysql = await createNew(req.body)
            result.push(resultUser)
            mysql.push(resultMysql)
        }
        
        res.json({
            data: result,
            dataMysql: mysql,
            message: 'Ok'
        })
    } catch(err){
        next(err)
    }
}

const createUser = (data, res) => {
    return new Promise((resolve, reject) => {
        const findUname = Model.findOne({username: data.username})
        const findEmail = Model.findOne({email: data.email})
        const findNumber = Model.findOne({phoneNumber: data.phoneNumber})
        let actions = [findUname, findEmail, findNumber]
        Promise.all(actions).then(cb => {
            // if(cb[0]) throw new Error("username already registered!")
            if(cb[0]) throw res.json({error: 400, message: 'username already registered!'});
            if(cb[1]) throw res.json({error: 400, message: 'email already registered'});
            if(cb[2]) throw res.json({error: 400, message: 'phone number already registered'});
            return Model.create(data)
        })
        .then(results => resolve(results))
        .catch(err=>reject(err))
    })
}

const createNew = async (data) => {
    // var salt = bcrypt.genSalt(12);
    var pass = await bcrypt.hash(data.password, 12);
    const query = await db.query(`INSERT INTO users (name, email, password) VALUES (?,?,?)`, [
        data.username, data.email, md5(data.password)
        // data.username, data.email, pass
    ])
    let message = 'Error in creating data';
    if(!query.affectedRows) return message;
    return query;
}

exports.kelolaPeriode = async (req, res, next) => {
    const id = req.user._id
    const data = req.body.periode
    try {
        const result = await Model.findByIdAndUpdate(id, {$push: {kelola: data}}, {new: true}).exec();
        res.json({
            data: result,
            message: 'Ok'
        })
        // console.log(id);
    } catch (error) {
        next(error)
    }
}

exports.findPeriode = async (req, res, next) => {
    try {
        const findPeriode = await Model.findById(req.user._id, {kelola: true});
        const kelola = findPeriode.kelola
        // findPeriode.map()
        var asyncMap = await Promise.all(kelola.map(async(x) => {
            var periode = await Periode.findById(x);
            // console.log(x);
            return periode;
        }))
        // console.log(asyncMap);
        res.json({
            data: asyncMap,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.forgetPassword = async (req, res, next) => {
    try {
        const user = await Model.findOne({email: req.body.email})
        if (!user) return next(createError(404, 'Email not found'))
        const randomText = await crypto.randomBytes(20);
        const token = randomText.toString('hex');
        await Model.findByIdAndUpdate(user._id, {resetPasswordToken: token, resetPasswordExpires: Date.now() + 3600000})
<<<<<<< HEAD
        const host = isDevMode ? `http://${req.hostname}:3000` : `https://${req.hostname}`
        const resetUrl = 'reset-password'
        const url = [host, resetUrl].join('/') + "?token=" + token
=======
        const host = isDevMode ? `http://${req.hostname}:4200` : `https://${req.hostname}`
        const resetUrl = 'reset-password'
        const url = [host, resetUrl, token].join('/')
>>>>>>> 55717eb... reset-password
        mailOptions.to = user.email
        mailOptions.subject = '[No-Reply] RESET PASSOWRD CHICKIN'
        mailOptions.html = `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        Please click on the following link, or paste this into your browser to complete the process <p><a href="${url}" target="_blank">${url}</a></p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`

        const isSent = await smtpTransport.sendMail(mailOptions)
        if(!isSent) return next(createError(500, 'Gagal mengirimkan email reset password'))
        res.json({
            message: `Permintaan reset [${user.email}] berhasil`
        })
    } catch (error) {
        next(error)
    }
}

exports.getToken = async (req, res, next) => {
    try {
        const result = await Model.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}).select('resetPasswordToken resetPasswordExpires')
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.resetPassword = async (req, res, next) => {
    try {
        console.log(req.query.token);
        const isInvalid = await Model.findOne({resetPasswordToken: req.params.token,  resetPasswordExpires: { $gt: Date.now()}});
        if (!isInvalid) return next(createError(403, 'Token tidak valid atau kadaluarsa'))
        const newPassword = passwordHash.generate(req.body.password, {saltLength: 10});
<<<<<<< HEAD
        const user = await Model.findByIdAndUpdate(isInvalid._id, {password: newPassword, resetPasswordToken: null, resetPasswordExpires: null})
=======
        const user = await Model.findByIdAndUpdate(isInvalid._id, {password: newPassword})
>>>>>>> 55717eb... reset-password
        
        mailOptions.to = user.email
        mailOptions.subject = `[No-Reply] Password Anda telah diubah`
        mailOptions.html = `Hi ${user.fullname}.\n\n Berikut ini adalah email pemberitahuan bahwa password akun ${user.email} telah diubah.\n`
        mailOptions.html = `<p>Your Chickin password has been reset</p>
        <p> Dear ${user.fullname}, </p>
        <p>The password for your Chickin, ${user.email}, has been successfully reset.</p>
        <br>
        <p>If you need additional help, please contact Chickin.</p>
        <p>Sincerely,</p>
        <br>
        <p>Chickin</p>
        `

        const isSent = await smtpTransport.sendMail(mailOptions)
        if (!isSent) return next(createError(500, 'Gagal mengirimkan notifikasi perubahan password'))
        res.json({
            message: `Notifikasi perubahan password [${user.email}] terkirim`
        })
    } catch (error) {
        next(error)
    }
}

exports.validationSignup = async (req, res, next) => {
    try {
        const findUname = Model.findOne({username: req.body.username})
        const findEmail = Model.findOne({email: req.body.email})
        const findNumber = Model.findOne({phoneNumber: req.body.phoneNumber})
        const result = await Promise.all([findUname, findEmail, findNumber])
        if(result[0]) return res.json({error: 400, message: 'username already registered!'})
        if(result[1]) return res.json({error: 400, message: 'email already registered!'})
        if(result[2]) return res.json({error: 404, message: 'phone number already registered!'})
    } catch (error) {
        next(error)
    }
}