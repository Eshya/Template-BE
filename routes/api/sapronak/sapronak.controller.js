const mongoose = require('mongoose');
const {parseQuery} = require('../../helpers');
const Model = require('./sapronak.model');
const selectPublic = '-createdAt -updatedAt';
const Produk = require('../produk/produk.model');

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

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        data.stock = req.body.kuantitas
        const findProduk = await Produk.findById(data.produk)
        
        findProduk.jenis === "OVK" ? data.kuantitas : data.kuantitas = data.zak * 50

        const findByPeriode = await Model.findOne({periode: data.periode})
        findByPeriode ? data.stock = data.stock + findByPeriode.stock : data.stock
        const insertSapronak = await Model.create(data);
        const updateStock = await Model.updateMany({periode: data.periode, _id: {$ne: insertSapronak._id}}, {$inc: findProduk.jenis === "OVK" ? {stockOVK: data.kuantitas} : {stock: data.kuantitas}})
        // console.log(results[1])
        res.json({
            updated: updateStock,
            data: insertSapronak,
            message: 'Ok'
        });
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = req.body;
    try {
        // data.kuantitas = data.zak * 50
        const findProduk = await Produk.findById(data.produk)
        findProduk.jenis === "OVK" ? data.kuantitas : data.kuantitas = data.zak * 50

        const findSapronak = await Model.findById(id)

        if(req.body.zak || req.body.kuantitas) {
            const diff = findSapronak.kuantitas - data.kuantitas
            await Model.updateMany({periode: mongoose.Types.ObjectId(findSapronak.periode._id), produk: mongoose.Types.ObjectId(findSapronak.produk._id)}, {$inc: findProduk.jenis === "OVK" ? {stockOVK: diff} : {stock: diff}})
        }
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
        const findById = await Model.find({_id: req.params.id})
        const findProduk = await Sapronak.findById(findById.produk._id)
        const updateSapronak = await Model.updateMany({periode: findById.periode, _id: {$ne: req.params._id}}, {$inc: findProduk === "OVK" ? {stockOVK: -findById.kuantitas} : {stock: -findById.kuantitas}})
        const deleteSapronak = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            updated: updateSapronak,
            data: deleteSapronak,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}