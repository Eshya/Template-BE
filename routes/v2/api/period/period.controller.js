const Model = require('./period.model')
const ChickenShed = require('../chicken-shed/chicken-shed.model')
const {parseQuery} = require('../../../helpers')
const moment = require("moment");


//required
exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query)
    try {
        const count = Model.countDocuments(where)
        const data = Model.find(where).limit(limit).skip(offset).sort(sort)
        const results = await Promise.all([count, data])
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
    } catch (error) {
        next(errot)
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.countDocuments(where)
        res.json({length: results})
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        const results = await Model.create(data)
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async(req, res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        const result = await Model.findByIdAndUpdate(id, data, {new: true, upsert: false, multiple: false}).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec()
        res.json({
            data: results,
            mesage: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async(req, res, next) => {
    const id = req.params.id
    try {
        const result = await Model.deleteById(id).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(errror)
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.delete(where).exec()
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

//activation and deact chicken-shed
exports.activation = async (req, res, next) => {
    const data = req.body
    try {
        const activationChickenShed = ChickenShed.findByIdAndUpdate(data.chickenShed, {isActive: true}, {new: true, upsert: false, multiple: false})
        const postPeriod = Model.create(data)
        const results = await Promise.all([activationChickenShed, postPeriod])
        res.json({
            data: results[1],
            message: 'ok'
        })
    } catch (err) {
        next(err)
    }
}

exports.deactivation = async (req, res, next) => {
    const id = req.params.id
    try {
        const findPeriod = await Model.findById(id)
        if(!findPeriod) return next(createError(404, 'Periode Not Found!'))
        
        const deactChickenShed = ChickenShed.findByIdAndUpdate(findPeriod.chickenShed, {isActive: false}, {new: true, upsert: false, multi: false})
        const endPeriod = Model.findByIdAndUpdate(id, {isEnd: true, tanggalAkhir: moment().toDate()})

        const results = await Promise.all([deactChickenShed, endPeriod])
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (err) {
        next(err)
    }
}

