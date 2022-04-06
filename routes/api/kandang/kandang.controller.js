const mongoose = require('mongoose');
const {parseQuery} = require('../../helpers');
const Model = require('./kandang.model');
const Role = require('../roles/roles.model')
// const Flock = require('../flock/flock.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const selectPublic = '-createdAt -updatedAt';
const fetch = require('node-fetch')
const Promise = require("bluebird");

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
        const roles = Role.findById(req.user.roles)
        var results = null
        if (roles.name == 'ppl'){
            results = await Model.find({_id: { $in: req.user.kelola}})
        } else if (roles.name = 'peternak') {
            const id = req.user._id
            results = await Model.find({createdBy: id})
        } else {
            results = await Model.find()
        }
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.getKelola = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const id = req.user._id
        const kandang = await Model.find({createdBy: id, isActive: true}).select('kode alamat kota populasi isActive isMandiri')

        let dataKelola = [];
        await Promise.map(kandang, async (item) => {

            // get periode
            let dataPeriode = [];
            let periode = await Periode.find({kandang: item._id}).sort('updatedAt')
            await Promise.map(periode, async (itemPeriode) => {
                // kalkulasi umur ayam
                let oneDay = 24 * 60 * 60 * 1000;
                let now = new Date(Date.now());
                let start = new Date(itemPeriode.tanggalMulai);
                let umurAyam = Math.round(Math.abs((now - start) / oneDay))

                // get kegiatan harian
                const dataKegiatanHarian = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode._id)}},
                    {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                    {$unwind: '$berat'},
                    {$group: {_id: '$_id', avgBerat: {$avg: '$berat.beratTimbang'}, tonase: {$sum: {$multiply: ['$berat.beratTimbang', '$berat.populasi']}}, totalPakan: {$sum: '$pakanPakai.beratPakan'}, totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
                ])

                const allTonase = dataKegiatanHarian.reduce((a, {tonase}) => a + tonase, 0)
                const allDeplesi = dataKegiatanHarian.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = dataKegiatanHarian.reduce((a, {totalKematian}) => a + totalKematian, 0);
                const allPakan = dataKegiatanHarian.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const avg = dataKegiatanHarian.reduce((a, {avgBerat}) => a + avgBerat, 0) / (dataKegiatanHarian.length);
                const atas = (100 - (((itemPeriode.populasi - (allDeplesi + allKematian)) / itemPeriode.populasi) * 100)) * avg;
                const bawah = (allPakan/allTonase) * umurAyam;

                dataPeriode.push({
                    idPeriode: itemPeriode._id,
                    umurAyam: umurAyam,
                    tanggalMulai: itemPeriode.tanggalMulai,
                    tanggalAkhir: itemPeriode.tanggalAkhir,
                    isEnd: itemPeriode.isEnd,
                    hargaSatuan: itemPeriode.hargaSatuan,
                    jenisDOC: itemPeriode.jenisDOC,
                    populasi: itemPeriode.populasi,
                    IP: bawah == 0 ? (atas/(bawah-1) * 100) : (atas / bawah) * 100,
                });
            });

            //get flock
            let flock = [];
            flock = await fetch('https://iot.chickinindonesia.com/api/flock/kandang/' + item._id, {
                method: 'get',
                headers: {
                    'Authorization': token,
                    "Content-Type": "application/json" }
            }).then(result => {
                if (result.ok) {
                    return result.json();
                }
            });

            dataKelola.push({
                idPemilik: item.createdBy ? item.createdBy._id : null,
                namaPemilik: item.createdBy ?  item.createdBy.fullname : null,
                idKandang: item._id,
                kodeKandang: item.kode,
                alamatKandang: item.alamat,
                kotaKandang: item.kota,
                dataPeriode: dataPeriode,
                dataFlock: flock ? flock.data : flock,
            });
        });

        res.json({
            data: dataKelola,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}