const {parseQuery, createError} = require('../../helpers');
const Model = require('./kegiatan-harian.model');
const Sapronak = require('../sapronak/sapronak.model');
const selectPublic = '-createdAt -updatedAt';

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort(sort);
    if(isPublic){
        data.select(selectPublic)
    }
    const results = await Promise.all([count, data]);
    return {length: results[0], data: results[1]};
}

exports.findAll = async (req, res, next) => {
    try {
        const results = await _find(req, false)
        res.json(results);
    } catch (error) {
        next(error);
    }
}

exports.findPublic = async (req, res, next) => {
    try {
        const results = await _find(req, true);
        res.json(results);
    } catch (error) {
        next(error);
    }
}

exports.count = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.countDocuments(where).exec();
        res.json({length: results});
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
        });
    } catch (error) {
        next(error);
    }
}

exports.findSisaAyam = async (req, res, next) => {
    const id = req.params.id;
    try {
        const results = await Model.aggregate([
            {
                $lookup: {
                    from: 'periode',
                    localField: 'periode',
                    foreignField: '_id',
                    as: 'periode'
                }
            }
        ])
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
        const foundSapronak = await Sapronak.findOne({periode: data.periode})
        if(!foundSapronak) return next(createError(404, 'Sapronak not found'))
        const jenisProduk = foundSapronak.produk.jenis
        if(jenisProduk == "Pakan"){
            const results = await Model.create(data);
            res.json({
                data: results,
                message: 'Ok'
            });
        } else {return next(createError(404, 'Pakan not found'))}
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params;
    const data = req.body;
    try {
        const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = req.body;
    try {
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multi: false}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.deleteMany(where).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const results = await (await Model.findByIdAndRemove(req.paramsid)).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}