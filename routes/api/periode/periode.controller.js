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
const mongoose = require('mongoose');
const Promise = require("bluebird");
const fetch = require('node-fetch')
const dayjs = require('dayjs');
const formula = require('../../helpers/formula')

const ONE_DAY = 24 * 60 * 60 * 1000;
const reducer = (acc, value) => acc + value

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
        // console.log(start, now)
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
        const start = !periode?.tanggalMulai ? new Date() : new Date(periode.tanggalMulai);
        // console.log(periode.populasi);
        const data = await KegiatanHarian.find({periode: id}).select('-periode').sort({'tanggal': -1})

        //findBWage0
        const findBW0 = data.find((e) => {
            const tanggal = new Date(e.tanggal)
            var umur = Math.round(Math.abs((tanggal - start) / ONE_DAY))
            if (umur === 0) return e
        })
        const BW0 = !findBW0 ? 0 : findBW0.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0);
        const sampleBW0 = !findBW0 ? 0 : findBW0.berat.reduce((a, {populasi}) => a + populasi, 0);
        const avgBW0 = BW0 / sampleBW0
        //mappingData 
        const map = await Promise.all(data.map(async (x) => {
            var tmp = x
            //findUmur
            const tanggal = new Date(x.tanggal)
            var umur = Math.round(Math.abs((tanggal - start) / ONE_DAY))
            //findDeplesi
            if (umur >= 50){ umur = 50 }
            const deplesiEkor = x.deplesi
            const populasiNow = periode.populasi - (x.deplesi + x.pemusnahan)
            tmp.deplesi = (x.deplesi + x.pemusnahan) / periode.populasi
            const std = await Data.findOne({day: umur})

            //findRGR
            const BW7 = x.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0)
            const sampleBW7 = x.berat.reduce((a, {populasi}) => a + populasi, 0)

            const avgBW7 = BW7 / sampleBW7

            const rgr = umur === 7 ? (avgBW7 - avgBW0) / avgBW0 * 100 : null

            const deplesi = (periode.populasi - (periode.populasi - (x.deplesi + x.pemusnahan))) * 100 / periode.populasi


            return {...tmp.toObject(), std: std == null ? null : std.toObject(), deplesiEkor: deplesiEkor, prosentaseDeplesi: deplesi, age: umur, populasi: populasiNow, rgr: rgr} // Join all of them in coolest way :-* - Atha
        }))

        const sortedData = map.sort((a, b) => b.age - a.age);
        res.json({
            data: sortedData,
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
        // const results = await Sapronak.aggregate([
        //     {$match: {periode: mongoose.Types.ObjectId(id)}},
        //     {$addFields: {pembelian: {$multiply: ["$kuantitas", "$hargaSatuan"]}}},
        //     {$group: {_id: "$tanggal", totalPembelian: {$sum: "$pembelian"}, sapronak: {$push: "$$ROOT"}}},
        // ])
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
        const periodeEnd = Model.findByIdAndUpdate(req.params.id, {isActivePPL: false, isEnd: true, tanggalAkhir: moment().toDate()}, {new: true, upsert: false, multi: false})
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
            if (getSapronak[i]?.produk?.jenis === 'PAKAN') {
                const compliment = getSapronak[i].zak  * getSapronak[i].hargaSatuan
                pembelianPakan += compliment
                // console.log(`${getSapronak[i].zak} :: ${getSapronak[i].hargaSatuan} :: ${compliment} :: ${pembelianPakan}  `)
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
        const akumulasiPenjualan = await Penjualan.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(id)}},
            {$project: {penjualan: {$multiply: ['$qty', '$harga', '$beratBadan']}}},
            {$group: {_id: '$periode', totalPenjualan: {$sum: '$penjualan'}}}
        ])
       
        // const pembelianSapronak = await Sapronak.aggregate([
        //     {$match: {periode: mongoose.Types.ObjectId(id)}},
        //     {$unwind: '$produk'},
        //     {$project: {pembelianSapronak: {$cond: {if: '$product.jenis' === 'PAKAN', then: {$multiply: ['$zak', '$hargaSatuan']}, else: {$multiply: ['$kuantitas', '$hargaSatuan']}}}}},
        //     {$group: {_id: '$periode', totalSapronak: {$sum: '$pembelianSapronak'}}}
        // ])
        const sapronak = pembelianPakan + pembelianOVK;
        const penjualanAyamBesar = akumulasiPenjualan[0] ? akumulasiPenjualan[0].totalPenjualan : 0
        const pendapatanPeternak = penjualanAyamBesar -pembelianDoc - sapronak
        const pendapatanPerEkor = pendapatanPeternak / populasiAkhir
        const totalPembelianSapronak = sapronak + pembelianDoc
        // console.log(penjualanAyamBesar)
        // console.log(pembelianPakan)
        // console.log(pembelianOVK)
        // console.log(pembelianDoc)
        // console.log(pendapatanPeternak)
        // console.log(pendapatanPerEkor)
        // console.log(totalPembelianSapronak)
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

const rataBW = async (req, day) => {
    const getPeriode = await Model.findById(req)
    const start = new Date(getPeriode.tanggalMulai);
    
    const findKegiatan = await KegiatanHarian.find({periode: getPeriode._id})
    const BW = findKegiatan.find((e) => {
        const tanggal = new Date(e.tanggal)
        var umur = Math.round(Math.abs((tanggal - start) / ONE_DAY))
        if (umur === day) return e
    })
    const akumulasiBW = !BW ? 0 : BW.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0);
    const sampleBW = !BW ? 0 : BW.berat.reduce((a, {populasi}) => a + populasi, 0);
    var avgBW = akumulasiBW / sampleBW
    const umur = findKegiatan.length
    return {avgBW, umur}
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

        const penjualan = await Penjualan.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$group: {_id: '$_id', tanggal: {$push: '$tanggal'}, terjual: {$sum: '$qty'}}}
        ])

        const dataPakan = await KegiatanHarian.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
            {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
        ])

        const dataDeplesi = await KegiatanHarian.aggregate([
            {$match: {periode: mongoose.Types.ObjectId(getPeriode.id)}},
            {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
        ])

        const getKegiatan = await KegiatanHarian.find({periode: getPeriode.id, berat: {$exists: true, $not:{$size: 0}}, pakanPakai: {$exists: true, $not:{$size: 0}}}).sort({'tanggal': -1}).limit(1).select('-periode')
        
        const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
        const latestSampling = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
        const latestFeed = getKegiatan[0] ? getKegiatan[0].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

        var avgLatestWeight = latestWeight/latestSampling
        getPeriode.isEnd == true ? avgLatestWeight = await formula.weightClosing(id) : avgLatestWeight

        const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
        const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
        const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
        const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
        const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
        const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);

        const populasiAkhir = getPeriode.populasi - (allDeplesi + allKematian )
        const populasiAktual = getPeriode.populasi - (allDeplesi + allKematian + allPenjualan )
        const deplesi = (getPeriode.populasi - (getPeriode.populasi - (allDeplesi + allKematian))) * 100 / getPeriode.populasi
        // const presentaseAyamHidup = 100 - deplesi
        const presentaseAyamHidup = await formula.liveChickenPrecentage(id);
        var FCR = await formula.FCR(id)
        getPeriode.isEnd == true ? FCR = await formula.FCRClosing(id) : FCR
        const atas = presentaseAyamHidup * (avgLatestWeight/1000)
        const bawah = FCR*(dataPakan.length-1)
        // var IP = (atas / bawah) * 100
        var IP = await formula.dailyIP(id)
        getPeriode.isEnd == true ? IP = await formula.IPClosing(id) : IP

        const detailPanen = penjualan.map(data => { return {
            panen: data.terjual,
            tanggal: data.tanggal[0]
        }});
        const sortedDetailPanen = detailPanen.sort((a,b) => b.tanggal - a.tanggal);
        const umur = await rataBW(req.params.id, 0)
        if (umur.umur >= 50){ umur.umur = 50 }
        // const populasiAktual = getPeriode.populasi - allPenjualan;
        const avgBW0 = await rataBW(req.params.id, 0)
        const avgBW7 = await rataBW(req.params.id, 7)
        const std = await Data.findOne({day: umur.umur})
        const stdRGR = await Data.findOne({day: 7}).select('rgr')
        const rgr = await formula.RGR(id);
        res.json({
            totalMortality: allDeplesi,
            totalCulling: allKematian,
            totalDeplesi: allDeplesi + allKematian,
            populasiAkhir: populasiAkhir,
            populasiAktual,
            populasiAwal: getPeriode.populasi,
            populasiAktual,
            detailPanen: sortedDetailPanen,
            panen: allPenjualan,
            jenisDoc: getPeriode.jenisDOC ? getPeriode.jenisDOC.name : "",
            IP: IP,
            deplesi: deplesi,
            beratAktual: avgLatestWeight,
            feedIntake: latestFeed * 1000 / populasiAkhir,
            ADG: 0,
            fcrAktual: FCR,
            diffFcr: FCR - std.fcr,
            RGR: rgr,
            diffRgr: rgr - stdRGR.rgr,
            pakanMasuk: pakanMasuk,
            pakanPakai: allPakan,
            pakan: pakanMasuk - allPakan,
            stdRgr: stdRGR.rgr
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
            // console.log(data);
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
            var IP = await formula.dailyIP(id)
            // console.log(avg);
            res.json({                
                FCR: allPakan/allTonase,
                Deplesi: ((findPopulasi[0] - kematian) / findPopulasi[0]) * 100,
                IP : IP
                
            })
        }
        // console.log(tonase);
    } catch (error) {
        next(error)
    }
}

exports.tambahPPL = async (req,res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        const addPPL = await Model.findByIdAndUpdate(id, {ppl: data.ppl, isActivePPL: true}, {new: true}).exec()
        res.json({
            data: addPPL,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.hapusPPL = async (req, res, next) => {
    const id = req.params.id
    try {
        const result = await Model.findByIdAndUpdate(id, {isActivePPL: false, ppl: null}, {new: true}).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.validateTambah = async (req,res, next) => {
    const data = req.body
    const token = req.headers['authorization']
    let url = process.env.AUTH_URL || `https://staging-auth.chickinindonesia.com`
    url = `${url}/api/users/`
    try {
        // process.env.DB_NAME === "chckin" ? url = `https://auth.chickinindonesia.com/api/users/` : url = `https://staging-auth.chickinindonesia.com/api/users/`
        if(!mongoose.Types.ObjectId.isValid(data.periode)) return res.json({data: null, error: 1016, message: "kandang tidak ditemukan!"})
        const results = await Model.findById(data.periode)
        const tmp = results
        if (!results) return res.json({data: null, error: 1016, message: 'kandang tidak ditemukan!'})
        const getUserName = await fetch(url + results.ppl, {
            method: 'GET',
            headers: {
                'Authorization': token,
                "Content-Type": "application/json" 
            }
        }).then(res => res.json()).then(data => data.data)
        const getUser = await fetch(url + results.kandang.createdBy, {
            method: 'GET',
            headers: {
                'Authorization': token,
                "Content-Type": "application/json" 
            }
        }).then(res => res.json()).then(data => data.data)
        if (results.ppl !== null) return res.json({error: 1015, data: results, error_data: getUserName.fullname, message: "kandang sudah dikelola!"})
        res.json({
            data: {...tmp.toObject(), user: getUser},
            message: 'Ok'
        })
    } catch(error) {
        next(error)
    }
}

exports.autoClosingCultivation = async (req, res, next) => {
  const chickenSheds = await Kandang.find({});
  const chickenShedIds = chickenSheds.map((chickenShed) => chickenShed._id);
  const periods = await Model.find({ kandang: { $in: chickenShedIds } });

  try {
    await Promise.all(
      chickenSheds.map(async (chickenShed) => {
        const periodData = periods.filter(
          (period) =>
            period.kandang._id.toString() === chickenShed._id.toString()
        );

        const periode = periodData.sort((a, b) => b.updatedAt - a.updatedAt);
        if (periode[0] && !periode[0].isEnd && chickenShed.isActive) {
          const today = dayjs(Date.now());
          const startDate = dayjs(new Date(periode[0].tanggalMulai));
          const chickenShedAge = Math.round(
            Math.abs(today.diff(startDate, "day"))
          );

          // Add 10 days from created date periode
          const periodeActiveDate = dayjs(periode[0].createdAt).add(10, "day");

          if (
            chickenShedAge >= 50 &&
            today.format("YYYY-MM-DD") >= periodeActiveDate.format("YYYY-MM-DD")
          ) {
            if (periode[0].ppl) {
              periode[0].isActivePPL = false;
            }

            periode[0].isEnd = true;
            periode[0].isAutoClosing = true;
            chickenShed.isActive = false;
            periode[0].tanggalAkhir = Date.now();

            await Promise.all([periode[0].save(), chickenShed.save()]);
          }
        }
      })
    );

    return res.json({ status: 200, message: "Successfully Auto Closing" });
  } catch (error) {
    return res.json({ status: 500, message: error.message });
  }
};

exports.reActivateChickenSheds = async (req, res, next) => {
    try {
      const periods = await Model.find({ isEnd: true, tanggalAkhir: null });

      if (!periods.length) {
        return res.json({ status: 500, message: err.message });
      }

      const chickenShedIds = periods.map(({ kandang }) => kandang._id);

      await Promise.all([
        Model.bulkWrite([
            {
                "updateMany": {
                    "filter": { "isEnd": true, "tanggalAkhir": null },
                    "update": { "$set": { "isEnd": false, "isAutoClosing": false }}
                }
            },
            {
             "updateMany": {
                "filter": { "ppl": { "$ne": null }},
                "update": { "$set": { "isActivePPL": true }},
                },
            }
        ]),

        Kandang.updateMany({ _id: { $in: chickenShedIds }}, {$set: { isActive: true }})
      ]);

      return res.json({
        status: 200,
        message: "Successfully Reactivate Chicken Sheds",
      });

    } catch (error) {
      return res.json({ status: 500, message: error.message });
    }
  };

exports.revenueChart = async(req, res, next) => {
    try {
        const chickenShed = await Kandang.findById(req.params.id);
        const periods = await Model.find({ kandang: chickenShed._id }, {_id: 1, populasi: 1, hargaSatuan: 1}).sort('tanggalMulai');

        const totalRevenue = await Promise.map(periods, async(periode, index) => {
            const estimateRevenue = await formula.estimateRevenue(periode._id);
            const periodIndex = periods.findIndex(index => index._id === periode._id);
            return {
                actual: estimateRevenue,
                periode: `Periode ${periodIndex+1}`
            }
        })

        return res.json({ data: totalRevenue, message: 'success', status: 200})
    } catch(error) {
        return res.json({ status: 500, message: error.message });
    }
}

exports.weightChart = async (req, res, next) => {
    try {
      // actual
      const actual = [];
      const periods = await Model.find({kandang: req.params.id}).sort({tanggalMulai: 1}).distinct("_id");
      if (periods.length) {
          const dailyActivitiesData = await KegiatanHarian.aggregate([
              {$match: {periode: {$in: periods}}},
              {$unwind: {'path': '$berat', "preserveNullAndEmptyArrays": true}},
              {$group: {
                  _id: '$_id', 
                  populasi: {$sum: '$berat.populasi'},
                  beratTimbang: {$sum: '$berat.beratTimbang'},
                  periode: { $first: '$$ROOT.periode' }
              }}
          ]);
  
          const weightChart = await Promise.map(periods, async(periodeData) => {
              const dailyActivities = dailyActivitiesData.filter(dailyActivity => dailyActivity.periode.toString() === periodeData.toString());
              const dailyWeight = !dailyActivities.length ? 0 : dailyActivities.reduce((a, {beratTimbang}) => a + beratTimbang, 0);
              const dailyWeightSample = !dailyActivities.length ? 0 : dailyActivities.reduce((a, {populasi}) => a + populasi, 0);
              const avgWeight = dailyWeight/dailyWeightSample;
              const periodIndex = periods.findIndex(index => index._id === periodeData);
              return {
                  actual: avgWeight || 0,
                  periode: `Periode ${periodIndex+1}`
              }
          })
  
          actual.push(...weightChart);
      }
   
      return res.json({ data: actual, message: 'success', status: 200  });
    } catch (error) {
      return res.json({ status: 500, message: error.message });
    }
  };

  exports.feedIntakeChart = async (req, res, next) => {
    try {
      const actual = [];
      const periods = await Model.find({ kandang: req.params.id }, {_id: 1, populasi: 1}).sort({
        tanggalMulai: 1,
      });

      if (periods?.length) {
        const feedIntakeChart = await Promise.map(
          periods,
          async (periodeData) => {
            const [totalDeplesi, dailyFeedIntake] = await Promise.all([
              periodeData ? formula.accumulateDeplesi(periodeData._id) : 0,
              periodeData ? formula.getFeedIntake(periodeData._id) : 0,
            ]);
  
            const currentPopulation = periodeData.populasi - totalDeplesi;
            const feedIntake = (dailyFeedIntake * 1000) / currentPopulation;
            const periodIndex = periods.findIndex(
              (index) => index._id === periodeData._id
            );
            return {
              actual: feedIntake,
              periode: `Periode ${periodIndex + 1}`,
            };
          }
        );
  
        actual.push(...feedIntakeChart);
      }
  
      return res.json({ data: actual, message: "success", status: 200 });
    } catch (error) {
      return res.json({ status: 500, message: error.message });
    }
  };
