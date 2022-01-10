const Model = require('./call-us.model');
const { parseQuery } = require('../../helpers');
const nodemailer = require('nodemailer');

const mailOptions = {
    from: 'reset@chickin.com',
}

const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: 'techinchickin@gmail.com',
      pass: 'gkljjxtuyvduhgsk',
    }
})

exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
        const data = Model.find(where).limit(limit).skip(offset).sort(sort);
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const results = await Model.findById(req.params.id);
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        mailOptions.to = 'contactchickin@gmail.com'
        mailOptions.subject = 'KELUHAN USERS'
        mailOptions.html = req.body.message

        const isSent = smtpTransport.sendMail(mailOptions);
        const create = Model.create(data);
        const results = await Promise.all([isSent, create])
        if(!results[0]) return next(createError(500, 'Gagal mengirimkan pesan'))
        res.json({
            data: results[1],
            message: `Permintaan reset [${req.body.email}]`
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = req.body
    try {
        const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.deleteMany(where).exec()
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const results = await (await Model.findByIdAndRemove(req.params.id)).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}