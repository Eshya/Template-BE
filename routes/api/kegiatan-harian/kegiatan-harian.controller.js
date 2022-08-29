const {parseQuery, createError} = require('../../helpers');
const Model = require('./kegiatan-harian.model');
const Sapronak = require('../sapronak/sapronak.model');
const Penjualan = require('../penjualan/penjualan.model')
const Periode = require('../periode/periode.model')
const mongoose = require('mongoose');
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
        const findPeriode = await Periode.findById(data.periode)
        const dataDeplesi = await Model.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(data.periode)}},
            {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])

        const penjualan = await Penjualan.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(data.periode)}},
            {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
        ])
        const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);

        const populasiAkhir = findPeriode.populasi - (allDeplesi + allKematian + allPenjualan)

        if (data.deplesi + data.pemusnahan > populasiAkhir) return res.json({error: 1008, message: 'data deplesi melebihi populasi akhir'})
        if(data.ovkPakai){
            Promise.all(data.ovkPakai.map(async(x) => {
                const foundSapronak = await Sapronak.findById(x.jenisOVK)
                if (!foundSapronak) return res.json({error: 1010, message: 'sapronak not found'})
                if (foundSapronak.stockOVK - x.kuantitas < 0) return res.json({error:1011, message:'OVK tidak mencukupi'})
                const dec = await Sapronak.updateMany({periode: data.periode, produk: foundSapronak.produk._id}, {$inc:{stockOVK: -x.kuantitas}})
                console.log(dec)
                return dec
            }))
        }
        if(data.pakanPakai){
            Promise.all(data.pakanPakai.map(async(x) => {
                x.beratPakan = x.beratZak * 50
    
                const foundSapronak = await Sapronak.findById(x.jenisPakan)
                if(!foundSapronak) return res.json({error:1010, message: 'sapronak not found'})
                if (foundSapronak.stock - x.beratPakan < 0) return res.json({error:1011, message: 'pakan tidak mencukupi'})
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
        const findPeriode = await Periode.findById(data.periode);
        if (!findPeriode) return res.json({error: 1009, message: 'periode or produk not found'})   
        const dataDeplesi = await Model.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(data.periode)}},
            {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])
        const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const populasiAkhir = findPeriode.populasi - (allDeplesi + allKematian)
        
        if (data.deplesi + data.pemusnahan > populasiAkhir) return res.json({error: 1008, message: 'data deplesi melebihi populasi akhir'}) 
        if(data.ovkPakai[0]){
            Promise.all(data.ovkPakai.map(async(x) => {
                const findSapronak = await Sapronak.findById(x?.jenisOVK ? x.jenisOVK : findKegiatan.ovkPakai[0].jenisOVK )
                if (!findSapronak) return res.json({error: 1010, message: 'Sapronak not found'})
                const oldStock = await findKegiatan.ovkPakai.find(e => e._id == findKegiatan.ovkPakai[0]._id)
                // if (!oldStock) return res.json({error: 1010, message: 'Sapronak not found'})
                if (!findSapronak.periode?._id || !findSapronak.produk?._id) return res.json({error: 1009, message: 'periode or produk not found'})
                const diff = (oldStock?.kuantitas === undefined ? 0 : oldStock.kuantitas) - x.kuantitas
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findSapronak.periode._id), produk: mongoose.Types.ObjectId(findSapronak.produk._id)}, {$inc: {stockOVK: diff}})
                return dec
            }))
        }
        
        if(data.pakanPakai[0]){
            Promise.all(data.pakanPakai.map(async(x) => {
                
                x.beratPakan = x.beratZak * 50
                const findSapronak = await Sapronak.findById(x?.jenisPakan ? x.jenisPakan : findKegiatan.pakanPakai[0].jenisPakan)
                if (!findSapronak) return res.json({error: 1010, message: 'jenisPakan not found'})
                const oldStock =  findKegiatan.pakanPakai.find(e => e._id == findKegiatan.pakanPakai[0]._id )
                // if (!oldStock) return res.json({error: 1010, message: 'pakanPakai not found'})
                // // console.log(`${findSapronak.periode?._id} : ${findSapronak.produk?._id}`)
                if (!findSapronak.periode?._id || !findSapronak.produk?._id) return res.json({error: 1009, message: 'periode or produk not found'})
                const diff = (oldStock?.beratPakan === undefined ? 0 : oldStock.beratPakan) - (x.beratZak * 50)
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findSapronak.periode._id), produk: mongoose.Types.ObjectId(findSapronak.produk._id)}, {$inc: {stock: diff}})
                return dec
            }))
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
    const id = req.params.id
    try {
        const findKegiatan = await Model.findById(id)

        if(findKegiatan.ovkPakai){
            Promise.all(findKegiatan.ovkPakai.map(async(x) => {
                const dec = await Sapronak.updateMany({periode: mongoose.Types.ObjectId(findKegiatan.periode._id), produk: mongoose.Types.ObjectId(x.jenisOVK.produk._id)}, {$inc:{stockOVK: x.kuantitas}})
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
