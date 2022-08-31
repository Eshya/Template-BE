const Model = require('./penjualan.model')
const {parseQuery} = require('../../helpers');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model');
const mongoose = require('mongoose');

exports.findAll = async (req, res, next) => {
    const {where, limit, offset, sort} = parseQuery(req.query);
    try {
        const count = Model.countDocuments(where);
        const data = Model.find(where).limit(limit).skip(offset).sort('updatedAt');
        const results = await Promise.all([count, data]);
        res.json({
            message: 'Ok',
            length: results[0],
            data: results[1]
        })
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
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body;
    try {
        const findKegiatan = await KegiatanHarian.find({periode: data.periode}).sort({tanggal: -1}).limit(1)
        if(!findKegiatan[0]) return res.json({error: 1005, message: 'kegiatan harian tidak ditemukan!'})

        const populasi = findKegiatan[0].periode.populasi
        
        const dataDeplesi = await KegiatanHarian.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(data.periode)}},
            {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])

        const penjualan = await Model.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(data.periode)}},
            {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
        ])

        const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);

        const populasiAkhir = populasi - (allDeplesi + allKematian + allPenjualan)

        const date1 = new Date(data.tanggal)
        const date2 = new Date(findKegiatan[0].tanggal)
        
       
        
        if(date1.getMonth() >= date2.getMonth() && date1.getDate() > date2.getDate() ) return res.json({error: 1006, message: 'isi kegiatan harian terlebih dahulu!'})
        if(populasiAkhir < data.qty) return res.json({error: 1007, data: {populasiAktual: populasiAkhir}, message: 'kuantiti melebihi populasi akhir!'})

        const results = await Model.create(data);
        
        res.json({
            data: {populasiAktual: populasiAkhir, results},
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
        if (data?.qty) {
            const penjualan = await Model.findById(id);
            const kegiatanHarian = await KegiatanHarian.find({periode: penjualan.periode}).sort({tanggal: -1}).limit(1)
            const populasi = kegiatanHarian[0].periode.populasi
            
            const dataDeplesi = await KegiatanHarian.aggregate([
                {$match: {periode: penjualan?.periode?._id}},
                {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
            ])

            const dataPenjualan = await Model.aggregate([
                {$match: {periode: penjualan?.periode?._id}},
                {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
            ])

            const totalDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
            const totalKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
            const allPenjualan = dataPenjualan.reduce((a, {terjual}) => a + terjual, 0);
            const populasiAkhir = populasi - (totalDeplesi + totalKematian + allPenjualan);
            const tempPopulasi = populasiAkhir + penjualan.qty;

            if(tempPopulasi < data.qty) {
                return res.json({error: 1007, message: 'kuantiti melebihi populasi akhir!', data: { populasiAktual: tempPopulasi } })  
            }

            const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec();
            res.json({
                data: {populasiAktual: populasiAkhir, results},
                message: 'Ok'
            })
        }
    } catch (error) {
        next(error);
    }
}

exports.updateWhere = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    const data = req.body;
    try {
        const results = await Model.updateMany(where, data, {new: true, upsert: false, multiple: false}).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.remove = async (req, res, next) => {
    const {where} = parseQuery(req.query);
    try {
        const results = await Model.deleteMany(where).exec();
        res.json({
            data: results,
            message: 'OK'
        })
    } catch (error) {
        next(error);
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const results = await Model.findByIdAndRemove(req.params.id).exec();
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}