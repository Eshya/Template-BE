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
    var data = req.body
    try {
        const findProduk = await Produk.findById(data.produk)
        
        findProduk.jenis === "OVK" ? data.kuantitas : data.kuantitas = data.zak * 50

        const findByPeriode = await Model.findOne({periode: data.periode, produk: data.produk})
        // console.log(findByPeriode)
        if (findProduk.jenis === "OVK") { findByPeriode ? data.stockOVK = Number(data.kuantitas) + Number(findByPeriode.stockOVK) : data.stockOVK = data.kuantitas }
        if (findProduk.jenis === "PAKAN") { findByPeriode ? data.stock = Number(data.kuantitas) + Number(findByPeriode.stock) : data.stock = data.kuantitas }

        // console.log(data)
        const insertSapronak = await Model.create(data)
        const updateStock = await Model.updateMany({periode: data.periode, _id: {$ne: insertSapronak._id}, produk: data.produk}, {$inc: findProduk.jenis === "OVK" ? {stockOVK: data.kuantitas} : {stock: data.kuantitas}});

        res.json({
            data: insertSapronak,
            updated: updateStock,
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
        const findSapronak = await Model.findById(id)
        const findProduk = await Produk.findById(findSapronak.produk._id)
        findProduk.jenis === "OVK" ? data.kuantitas : data.kuantitas = data.zak * 50

        if(data.zak || data.kuantitas) {
            const diff = data.kuantitas - findSapronak.kuantitas
            await Model.updateMany({periode: findSapronak.periode._id, produk: findSapronak.produk._id, _id: {$ne: req.params._id}}, {$inc: findProduk.jenis === "OVK" ? {stockOVK: diff} : {stock: diff}})
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
        const findById = await Model.findOne({_id: req.params.id})
        const findProduk = await Produk.findById(findById.produk._id)
        const updateSapronak = await Model.updateMany({periode: findById.periode, _id: {$ne: req.params._id}, produk: findById.produk._id}, {$inc: findProduk.jenis === "OVK" ? {stockOVK: -findById.kuantitas} : {stock: -findById.kuantitas}})
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