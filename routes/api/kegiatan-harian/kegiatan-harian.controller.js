const {parseQuery, createError} = require('../../helpers');
const Model = require('./kegiatan-harian.model');
const Sapronak = require('../sapronak/sapronak.model');
const mongoose = require('mongoose');
const { create } = require('./kegiatan-harian.model');
const selectPublic = '-createdAt -updatedAt';

const _find = async (req, isPublic = false) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    const count = Model.countDocuments(where);
    const data = Model.find(where).limit(limit).skip(offset).sort('updatedAt');
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
            {$match: {_id: mongoose.Types.ObjectId(id)}},
            {$unwind: '$periode'},
            {
                $lookup: {
                    from: 'periode',
                    localField: 'periode',
                    foreignField: '_id',
                    as: 'periode_join'
                }
            },
            {$unwind: '$periode_join'},
            {$project: {'results' : {$subtract: ['$periode_join.populasi', '$deplesi']}}}
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
        if(data.ovkPakai){
            Promise.all(data.ovkPakai.map(async(x) => {
                const foundSapronak = await Sapronak.findById(x.jenisOVK)
                if (!foundSapronak) throw createError(400, 'sapronak not found')
                if (foundSapronak.stockOVK - x.kuantitas < 0) throw createError(401, 'OVK tidak mencukupi')
                const dec = await Sapronak.updateMany({periode: data.periode, produk: foundSapronak.produk._id}, {$inc:{stockOVK: -x.kuantitas}})
                console.log(dec)
                return dec
            }))
        }
        if(data.pakanPakai){
            Promise.all(data.pakanPakai.map(async(x) => {
                x.beratPakan = x.beratZak * 50
    
                const foundSapronak = await Sapronak.findById(x.jenisPakan)
                if(!foundSapronak) throw createError(401, 'sapronak not found')
                if (foundSapronak.stock - x.beratPakan < 0) throw createError(400, 'pakan tidak mencukupi')
                const dec = await Sapronak.updateMany({periode: data.periode, produk: foundSapronak.produk._id}, {$inc:{stock: -x.beratPakan}})
                console.log(dec)
                return dec
            }))
        }


        const results = await Model.create(data)
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = req.body;
    try {
        const findKegiatan = await Model.findById(id);
        if(data.ovkPakai){
            Promise.all(data.ovkPakai.map(async(x) => {
                const findSapronak = await Sapronak.findById(x.jenisOVK)
                const oldStock = findKegiatan.ovkPakai.find(e => e._id == x._id)
                const diff = oldStock.kuantitas - x.kuantitas
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findSapronak.periode._id), produk: mongoose.Types.ObjectId(findSapronak.produk._id)}, {$inc: {stockOVK: diff}})
                return dec
            }))
        }
        if(data.pakanPakai){
            Promise.all(data.pakanPakai.map(async(x) => {
                x.beratPakan = x.beratZak * 50
                const findSapronak = await Sapronak.findById(x.jenisPakan)
                const oldStock = findKegiatan.pakanPakai.find(e => e._id == x._id)
                console.log(oldStock)
                const diff = oldStock.beratPakan - (x.beratZak * 50)
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findSapronak.periode._id), produk: mongoose.Types.ObjectId(findSapronak.produk._id)}, {$inc: {stock: diff}})
                return dec
            }))
        }
        // }
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
    const id = req.params.id
    try {
        const findKegiatan = await Model.findById(id)

        if(findKegiatan.ovkPakai){
            Promise.all(findKegiatan.ovkPakai.map(async(x) => {
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findKegiatan.periode._id), produk: mongoose.Types.ObjectId(x.jenisPakan.produk._id)}, {$inc:{stockOVK: x.kuantitas}})
                return dec
            }))
        }
        Promise.all(findKegiatan.pakanPakai.map(async(x) => {
            const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findKegiatan.periode._id), produk: mongoose.Types.ObjectId(x.jenisPakan.produk._id)}, {$inc:{stock: x.beratPakan}})
            return dec
        }))

        const results = await Model.findByIdAndRemove(id)
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}