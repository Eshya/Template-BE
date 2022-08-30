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
const _MS_PER_DAY = 1000 * 60 * 60 * 24;
let dateDiffInDays = (a, b) => {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
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
        const populasiAktual = populasi - allPenjualan;

        const date1 = new Date(data.tanggal)
        const date2 = new Date(findKegiatan[0].tanggal)
        
        if(date1.getMonth() >= date2.getMonth() && date1.getDate() > date2.getDate() ) return res.json({error: 1006, message: 'isi kegiatan harian terlebih dahulu!'})
        if(populasiAkhir < data.qty) return res.json({error: 1007, data: {populasiAktual}, message: 'kuantiti melebihi populasi akhir!'})

        const results = await Model.create(data);
        
        res.json({
            data: { populasiAktual, results },
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
        const penjualan = await Model.findById(id);
        const kegiatanHarian = await KegiatanHarian.find({periode: penjualan.periode}).sort({tanggal: -1}).limit(1)
        const populasi = kegiatanHarian[0].periode.populasi
        const dataPenjualan = await Model.aggregate([
            {$match: {periode: penjualan?.periode?._id}},
            {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
        ])

        const allPenjualan = dataPenjualan.reduce((a, {terjual}) => a + terjual, 0);
        const populasiAktual = populasi - allPenjualan;
        const dataDeplesi = await KegiatanHarian.aggregate([
            {$match: {periode: penjualan?.periode?._id}},
            {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])

        const totalDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const totalKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const populasiAkhir = populasi - (totalDeplesi + totalKematian + allPenjualan);
        
        const date1 = new Date(data.tanggal)
        const date2 = new Date(kegiatanHarian[0].tanggal)
        const diffDay = dateDiffInDays(date2,date1)
        if(diffDay >=1 ) return res.json({error: 1006, message: 'Edit Tidak Bisa Melebihi Data Harian'})
       
        if (data?.qty) {
            const tempPopulasi = populasiAkhir + penjualan.qty;
            
            if(tempPopulasi < data.qty) {
                return res.json({error: 1007, data: {populasiAktual}, message: 'kuantiti melebihi populasi akhir!' })  
            }
        }

        const results = await Model.findByIdAndUpdate(id, data, {new: true}).exec();

        res.json({
            data: {populasiAktual, results},
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
