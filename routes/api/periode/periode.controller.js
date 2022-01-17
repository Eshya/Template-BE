const { parseQuery, createError } = require("../../helpers");
const Model = require("./periode.model");
const Kandang = require('../kandang/kandang.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const moment = require("moment");
const Nekropsi = require("../nekropsi/nekropsi.model");
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Data = require('../data/data.model');
const selectPublic = '-createdAt -updatedAt'
const mongoose = require('mongoose')

const ONE_DAY = 24 * 60 * 60 * 1000;

// const _beforeSave = (data) => {
//     if(!data.kemitraan){
//         data.kemitraan = null
//     }
//     return data
// }

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
        const now = new Date(Date.now());
        const start = new Date(data.tanggalMulai);
        const result = Math.round(Math.abs((now - start) / ONE_DAY))
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

exports.findKegiatan = async (req, res, next) => {
    const id = req.params.id
    try {
        const periode = await Model.findById(id)
        const start = new Date(periode.tanggalMulai);
        // console.log(periode);
        const data = await KegiatanHarian.find({periode: id}).select('-periode').sort({'tanggal': -1})

        const map = await Promise.all(data.map(async (x) => {
            var tmp = x
            const tanggal = new Date(x.tanggal)
            var umur = Math.round(Math.abs((tanggal - start) / ONE_DAY))
            if (umur >= 50){ umur = 50 }
            const deplesiEkor = x.deplesi
            tmp.deplesi = (x.deplesi + x.pemusnahan) / periode.populasi
            const std = await Data.findOne({day: umur})
            return {...tmp.toObject(), std: std == null ? null : std.toObject(), deplesiEkor: deplesiEkor, age: umur} // Join all of them in coolest way :-* - Atha
        }))

        //console.log(map)

        // const asyncResults = await Promise.all(data.map(async(x) => {
        //     var findData = {}
        //     const tanggal = new Date(x.tanggal)
        //     var umur = Math.round(Math.abs((tanggal - start) / ONE_DAY) - 1)
        //     if(umur >= 50){umur = 50}
        //     const std = await Data.find({day: umur})
        //     x.deplesi = (x.deplesi + x.pemusnahan) / periode.populasi
        //     Object.assign(findData, x._doc, std)
        //     x.std = std
        //     return findData
        // }))
        res.json({
            data: map,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findNekropsi = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Nekropsi.find({periode: id}).sort({'tanggal': -1})
        res.json({
            data: results,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findPenjualan = async (req, res, next) => {
    const id = req.params.id
    try {
        const result = await Penjualan.find({periode: id}).sort({'tanggal': -1})
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findSapronak = async (req, res, next) => {
    const id = req.params.id
    try {
        const results = await Sapronak.find({periode: id}).sort({'createdAt': -1})
        res.json({
            data: results,
            message: 'Ok'
        })
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
    const data = req.body
    const user = req.user.id
    try {
        const isActive =  Kandang.findByIdAndUpdate(data.kandang, {isActive: true}, {new: true, upsert: false, multi: false})
        const dataPeriode = Model.create(data)

        const results = await Promise.all([isActive, dataPeriode])
        res.json({
            data: results[1],
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.endPeriode = async (req, res, next) => {
    try {
        const findKandang = await Model.findById(req.params.id);
        if(!findKandang) return next(createError(404, 'Periode Not Found!'))
        const kandangActive = Kandang.findByIdAndUpdate(findKandang.kandang, {isActive: false}, {new: true, upsert: false, multi: false})
        const periodeEnd = Model.findByIdAndUpdate(req.params.id, {isEnd: true, tanggalAkhir: moment().toDate()}, {new: true, upsert: false, multi: false})
        const results = await Promise.all([kandangActive, periodeEnd])
        res.json({
            data: results,
            message: 'Ok'
        })
        // res.json(findKandang.kandang)
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id
    const where = req.body
    try {
        const data = await Model.findByIdAndUpdate(id, where, {new: true}).exec();
        res.json({data: data, message: 'Ok'})
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

exports.getBudidaya = async (req, res, next) => {
    const id = req.params.id
    const reducer = (acc, value) => acc + value
    try {
        let harian = []
        let kematian = []
        let pembelianPakan = 0
        let pembelianOVK = 0
        const doc = await Model.findById(id);
        const pembelianDoc = doc.populasi * doc.hargaSatuan
        const getSapronak = await Sapronak.find({periode: id});
        // const penjualanAyamBesar = await 
        for (let i = 0; i < getSapronak.length; i++) {
            if (getSapronak[i].produk.jenis === 'PAKAN') {
                const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                pembelianPakan += compliment
            } else {
                const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                pembelianOVK += compliment
            }
        }
        const getKegiatan = await KegiatanHarian.find({periode: id})
        getKegiatan.forEach(x => {
            kematian.push(x.deplesi + x.pemusnahan)
        });
        const totalKematian = kematian.reduce(reducer, 0);
        const populasiAkhir = doc.populasi - totalKematian
        const getPenjualan = await Penjualan.find({periode: id})
        getPenjualan.forEach(x => {
            harian.push(x.beratBadan * x.harga * x.qty)
        })
        const penjualanAyamBesar = harian.reduce(reducer, 0);
        const pendapatanPeternak = penjualanAyamBesar -pembelianDoc - pembelianOVK - pembelianPakan
        const pendapatanPerEkor = pendapatanPeternak / populasiAkhir
        const totalPembelianSapronak = pembelianPakan + pembelianOVK + pembelianDoc

        res.json({
            'penjualanAyamBesar': penjualanAyamBesar,
            'pembelianPakan': pembelianPakan,
            'pembelianOVK': pembelianOVK,
            'pembelianDOC': pembelianDoc,
            'pendapatanPeternak': pendapatanPeternak,
            'pendapatanPerEkor': pendapatanPerEkor,
            'totalPembelianSapronak': totalPembelianSapronak,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.ringkasan = async (req, res, next) => {
    const id = req.params.id
    try {
        const getPeriode = await Model.findById(id)
        const sapronak = await Sapronak.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$lookup:  {
                "from": "produk",
                "localField": "produk",
                "foreignField": "_id",
                "as": "produk_info"
            }},
            {$unwind: '$produk_info'},
            {$group: {_id: '$produk_info.jenis', pakan_masuk: {$sum: '$kuantitas'}}}
        ])
        // console.log(sapronak);

        const penjualan = await Penjualan.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
        ])
        // const getDeplesi = KegiatanHarian.find({periode: id})
        const data = await KegiatanHarian.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$unwind: '$pakanPakai'},
            {$unwind: '$berat'},
            {$group: {_id: '$_id', avgBerat: {$avg: '$berat.beratTimbang'}, tonase: {$sum: {$multiply: ['$berat.beratTimbang', '$berat.populasi']}}, totalPakan: {$sum: '$pakanPakai.beratPakan'}, totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])
        // console.log(data)
        const oneDay = 24 * 60 * 60 * 1000;
        const now = new Date(Date.now());
        const start = new Date(getPeriode.tanggalMulai);
        const result = Math.round(Math.abs((now - start) / oneDay))

        const allTonase = data.reduce((a, {tonase}) => a + tonase, 0)
        const allDeplesi = data.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const allKematian = data.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
        const allPakan = data.reduce((a, {totalPakan})=>a + totalPakan, 0);
        const avg = data.reduce((a, {avgBerat}) => a + avgBerat, 0) / (data.length - 1);
        const atas = (100 - (((getPeriode.populasi - (allDeplesi + allKematian)) / getPeriode.populasi) * 100)) * avg
        const bawah = (allPakan/allTonase) * result
        // const pakanMasuk = sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);
        const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
        const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);
        console.log(pakanMasuk);
        // console.log(alldeplesi);
        res.json({
            populasiAkhir: getPeriode.populasi - (allDeplesi + allKematian + allPenjualan),
            populasiAwal: getPeriode.populasi,
            panen: allPenjualan,
            jenisDoc: getPeriode.jenisDOC ? getPeriode.JenisDOC.name : "",
            IP: (atas / bawah) * 100,
            deplesi: ((allDeplesi + allKematian) / getPeriode.populasi) * 100,
            beratAktual: avg,
            feedIntake: allPakan / (getPeriode.populasi - (allDeplesi + allKematian + allPenjualan)),
            ADG: 0,
            fcrAktual: allPakan / allTonase,
            diffFcr: 0,
            pakanMasuk: pakanMasuk,
            pakanPakai: allPakan,
            pakan: pakanMasuk - allPakan
        })
    } catch (error) {
        next(error)
    }
}

exports.sendNotif = async (req, res, next) => {
    const token = req.user.tokenFcm
    try {
        
    } catch (error) {
        next(error)
    }
}

exports.performa = async (req, res, next) => {
    const firstPeriode = req.query.first
    const secondPeriode = req.query.second
    const reducer = (acc, value) => acc + value
    // const {first, second} = parseQuery(req.query)
    try {
        let pakan = []
        let tonase = []
        const findStart = await Model.findById(firstPeriode, {tanggalMulai: true})
        const findFinish = await Model.findById(secondPeriode, {tanggalMulai: true})
        const start = new Date(findStart.tanggalMulai)
        const finish = new Date(findFinish.tanggalMulai)
        //get total tonase
        const result = await Model.find({kandang: findStart.kandang, tanggalMulai: {$gte: start, $lte: finish}})
        for (const x of result) {
            const data = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(x.id)}},
                {$unwind: '$berat'},
                {$unwind: '$pakanPakai'},
                // {$unwind: '$periode'},
                // {$project: {periode: '$periode._id'}},
                {$group: {_id: '$_id', avgBerat: {$avg: '$berat.beratTimbang'}, tonase: {$sum: {$multiply: ['$berat.beratTimbang', '$berat.populasi']}}, pakan: {$sum: '$pakanPakai.beratPakan'}, totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
            ])
            console.log(data);
            const oneDay = 24 * 60 * 60 * 1000;
            const now = new Date(x.tanggalAkhir);
            const start = new Date(x.tanggalMulai);
            const result = Math.round(Math.abs((now - start) / oneDay))
            // console.log(data.length);
            if (data.length) {
                tonase.push(data)
                data.push({
                    tonase: 0,
                    pakan: 0,
                    totalDeplesi: 0,
                    avgBerat: 0,
                    totalKematian: 0,
                    populasi: x.populasi,
                    umur: result
                })
            }
        }
        // console.log(tonase[0]);
        for (let i = 0; i < tonase.length; i++) {
            const allTonase = tonase[i].reduce((a, {tonase}) => a + tonase, 0)
            const allPakan = tonase[i].reduce((a, {pakan}) => a + pakan, 0)
            const allDeplesi = tonase[i].reduce((a, {totalDeplesi}) => a + totalDeplesi, 0)
            const allKematian = tonase[i].reduce((a, {totalKematian}) => a + totalKematian, 0)
            const findPopulasi = tonase[i].filter(x => x.populasi).map(x => x.populasi)
            const findUmur = tonase[i].filter(x => x.umur).map(x => x.umur)
            const avg = tonase[i].reduce((a, {avgBerat}) => a + avgBerat, 0) / (tonase[i].length - 1)
            // console.log(sum);
            const kematian = allDeplesi + allKematian
            const atas = (100 - (((findPopulasi[0] - kematian) / findPopulasi[0]) * 100)) * avg
            const bawah = (allPakan/allTonase) * findUmur 
            // console.log(avg);
            res.json({                
                FCR: allPakan/allTonase,
                Deplesi: ((findPopulasi[0] - kematian) / findPopulasi[0]) * 100,
                IP : (atas / bawah) * 100
            })
        }
        // console.log(tonase);
    } catch (error) {
        next(error)
    }
}