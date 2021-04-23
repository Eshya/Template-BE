const { parseQuery, createError } = require("../../helpers");
const Model = require("./periode.model");
const Kandang = require('../kandang/kandang.model');
const moment = require("moment");
const selectPublic = '-createdAt -updatedAt'

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort)
    if(isPublic){
        data.select(selectPublic);
    }
    const results = await Promise.all([count, data]);
    return {length: results[0], data: results[1]};
}

exports.umurAyam = async (req, res, next) => {
    try {
        const data = await Model.findById(req.params.id);
        const oneDay = 24 * 60 * 60 * 1000;
        const now = new Date(Date.now());
        const start = new Date(data.tanggalMulai);
        const result = Math.round(Math.abs((now - start) / oneDay))
        console.log(start, now)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.findAll = async (req, res, next) => {
    try {
        const results = await _find(req, false);
        res.json(results);
    } catch (error) {
        next(error)
    }
}

exports.findPublic = async(req, res, next) => {
    try {
        const results = await _find(req, true);
        res.json(results)
    } catch (error) {
        next(error);
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.countDocuments(where).exec();
        res.json({length: results})
    } catch (error) {
        next(error);
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
        next(error);
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        const isActive =  Kandang.findByIdAndUpdate(data.kandang, {isActive: true}, {new: true, upsert: false, multi: false})
        const dataPeriode = Model.create(data)
        const results = await Promise.all([isActive, dataPeriode])
        res.json({results})
    } catch (error) {
        next(error)
    }
}

exports.endPeriode = async (req, res, next) => {
    try {
        const findKandang = await Model.findById(req.params.id);
        if(!findKandang) return next(createError(404, 'Periode Not Found!'))
        const kandangActive = Kandang.findByIdAndUpdate(findKandang.kandang, {isActive: false}, {new: true, upsert: false, multi: false})
        const periodeEnd = Model.findByIdAndUpdate(req.params.id, {isEnd: true, tanggalAkhir: moment().toDate()}, {new: true, upsert: fasle, multi: false})
        const results = await Promise.all([kandangActive, periodeEnd])
        res.json({results})
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id
    const where = req.body
    try {
        const data = await Model.findByIdAndUpdate(id, where, {new: true}).exec();
        res.json(data)
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    try {
        const where = parseQuery(req.query.where, req.query.i)
        const data = await Model.findOneAndUpdate(where, req.body, {new: true, upsert: false, multi: fasle}).exec()
        res.json({data})
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    try {
        const where = parseWhere(req.query.where, req.query.i)
        const data = await Model.deleteMany(where)
        res.json({data})
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const data = await Model.findByIdAndRemove(req.params.id)
        res.json({data})
    } catch (error) {
        next(error)
    }
}