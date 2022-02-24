const mongoose = require('mongoose');
const {parseQuery} = require('../../helpers');
const Model = require('./kandang.model');
// const Flock = require('../flock/flock.model');
const Periode = require('../periode/periode.model');
const selectPublic = '-createdAt -updatedAt';
const fetch = require('node-fetch')


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

exports.countPopulasi = async (req, res, next) => {
    const id = req.params.id
    try {
        const result = await Periode.findById(id, {populasi: true}).select('-kandang -jenisDOC')
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
        const results = await _find(req, false)
        res.json(results);
    } catch (error) {
        next(error)
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
    const {where} = parseQuery(req.query)
    try {
        const results = await Model.countDocuments(where).exec();
        res.json({length: results});
    } catch (error) {
        next(error);
    }
}

exports.findActive = async (req, res, next) => {
    const where = {}
    try {
        where['isActive'] = true
        const data = Model.find(where).sort('updateAt')
        const count = Model.countDocuments(where)
        const results = await Promise.all([count, data])
        res.json({length: results[0], data: results[1]});
    } catch (error) {
        next(error)
    }
}

exports.findFlock = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Flock.find({kandang: id})
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findPeriode = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Periode.find({kandang: id}).sort('updatedAt')
        if (results.length > 0){
            const oneDay = 24 * 60 * 60 * 1000;
            const now = new Date(Date.now());
            const start = new Date(results[results.length - 1].tanggalMulai);
            // console.log(start);
            const umurAyam = Math.round(Math.abs((now - start) / oneDay))
            // console.log(umurAyam);
            res.json({
                age: umurAyam,
                dataLuar: results[results.length - 1],
                data: results,
                message: 'Ok'
            })
        } else {
            res.json({
                age: null,
                dataLuar: null,
                data: results,
                message: 'Ok'
            })
        }
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
       next(error); 
    }
}

exports.insert = async (req, res, next) => {
    const token = req.headers['authorization']
    const {kode, alamat, tipe, isMandiri, kota, populasi} = req.body;
    const createdBy = req.user._id
    const flock = []
    try {
        const results = await Model.create({kode, alamat, tipe, isMandiri, kota, createdBy, populasi});
        // console.log(results._id)
        const body = {
            name: 'flock 1',
            kandang: results._id
        }
        await fetch('https://iot.chickinindonesia.com/api/flock', {
            method: 'post',
            body: JSON.stringify(body),
            headers: {
                'Authorization': token,
                "Content-Type": "application/json" }
        }).then(res => res.json()).then(data => flock.push(data))
        // console.log(insertFlock)
        res.json({
            data: results,
            flock: flock,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
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
        res.json({data: results, message: 'Ok'});
    } catch (error) {
        next(error);
    }
}

exports.remove = async(req, res, next) => {
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
        const results = await Model.deleteById(req.params.id).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.findByUser = async (req, res, next) => {
    try {
        const id = req.user._id
        const results = await Model.find({createdBy: id})
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}