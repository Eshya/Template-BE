const mongoose = require('mongoose');
const {parseQuery} = require('../../helpers');
const Model = require('./kandang.model');
const Role = require('../roles/roles.model')
// const Flock = require('../flock/flock.model');
const Periode = require('../periode/periode.model');
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Nekropsi = require("../nekropsi/nekropsi.model");
const DataSTD = require('../data/data.model');
const PeternakModel = require('../peternak/peternak.model');
const selectPublic = '-createdAt -updatedAt';
const fetch = require('node-fetch')
const Promise = require("bluebird");
const reducer = (acc, value) => acc + value;
const ONE_DAY = 24 * 60 * 60 * 1000;
const moment = require('moment');
const excelJS = require("exceljs");

var urlIOT = process.env.DB_NAME === "chckin" ? `prod-iot.chickinindonesia.com` : `staging-iot.chickinindonesia.com`
var urlAuth = process.env.DB_NAME === "chckin" ? `auth.chickinindonesia.com` : `staging-auth.chickinindonesia.com`
const handleQuerySort = (query) => {
    try{
      const toJSONString = ("{" + query + "}").replace(/(\w+:)|(\w+ :)/g, (matched => {
          return '"' + matched.substring(0, matched.length - 1) + '":';
      }));
      return JSON.parse(toJSONString);
    }catch(err){
      return JSON.parse("{}");
    }
}

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

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
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

function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

exports.findAllDataPool =  async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const {limit, offset} = parseQuery(req.query);
        const { name, address, city, isActive } = req.query;
        let sort = handleQuerySort(req.query.sort);
        let role = req.user.role ? req.user.role.name : '';
        let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const filter = {}
        if (name) {
            filter.kode = new RegExp(name, 'i') 
        }
        if (address) {
            filter.alamat = new RegExp(address, 'i') 
        }
        if (city) {
            filter.kota = new RegExp(city, 'i') 
        }
        if (isActive) {
            filter.isActive = isActive
        }
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { kode: 1 }
        }

        let count;
        let result = [];
        if (role === "adminkemitraan") {
            const data = await Model.find(filter).sort(sort)
            for (let i = 0; i < data.length; i++) {
                let filterPeriod = {};
                filterPeriod.kandang = data[i].id;
                filterPeriod.kemitraan = kemitraanId
                const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
                if (periode && periode.kandang) {
                    // get periode ke
                    const kandang = await Periode.find(filterPeriod).sort('tanggalMulai')
                    let dataPeriode = [];
                    await Promise.map(kandang, async (itemKandang, index) => {
                        if (itemKandang._id.toString() === periode._id.toString()) {
                            dataPeriode.push(index + 1);
                        }
                    });
    
                    // get usia
                    const now = new Date(Date.now());
                    const start = new Date(periode.tanggalMulai);
                    const usia = periode.isEnd ? Math.round(Math.abs((periode.tanggalAkhir - start) / ONE_DAY)) :  Math.round(Math.abs((now - start) / ONE_DAY))

                    //find detail peternak
                    const findUser = await fetch(`https://${urlAuth}/api/users/${data[i].createdBy}`, {
                        method: 'GET',
                        headers: {'Authorization': token,
                        "Content-Type": "application/json"}
                    }).then(res => res.json()).then(data => data.data)
                    let namaPemilik = findUser ? findUser.fullname : ""

                    // sort by nama kandang
                    let namaKandang = data[i].kode ? data[i].kode : ""
                    let namaKandangSTR = namaKandang.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                        return letter.toUpperCase();
                    });

                    if (namaPemilik !== "") {
                        result.push({
                            idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                            namaPemilik: namaPemilik,
                            idKandang: data[i]._id,
                            namaKandang: namaKandangSTR,
                            kota: data[i].kota,
                            isActive: data[i].isActive ? "Aktif" : "Rehat",
                            usia: usia,
                            periodeKe: dataPeriode[0]
                        });
                    }
                }
            }
            count = result.length
            let offsetPaging;
            if (offset == 0) {
                offsetPaging = 1
            } else {
                offsetPaging = (offset / 10 + 1)
            }
            let resultSort = result.sort(dynamicSort("namaKandang"));
            result = paginate(resultSort, limit, offsetPaging)
        } else {
            count = await Model.countDocuments(filter)
            const data = await Model.find(filter).limit(limit).skip(offset).sort(sort)
            for (let i = 0; i < data.length; i++) {
                let filterPeriod = {};
                filterPeriod.kandang = data[i].id;
                const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 })
                if (periode && periode.kandang) {
                    // get periode ke
                    const kandang = await Periode.find(filterPeriod).sort('tanggalMulai')
                    let dataPeriode = [];
                    await Promise.map(kandang, async (itemKandang, index) => {
                        if (itemKandang._id.toString() === periode._id.toString()) {
                            dataPeriode.push(index + 1);
                        }
                    });
    
                    // get usia
                    const now = new Date(Date.now());
                    const start = new Date(periode.tanggalMulai);
                    const usia = periode.isEnd ? Math.round(Math.abs((periode.tanggalAkhir - start) / ONE_DAY)) :  Math.round(Math.abs((now - start) / ONE_DAY))

                    //find detail peternak
                    const findUser = await fetch(`https://${urlAuth}/api/users/${data[i].createdBy}`, {
                        method: 'GET',
                        headers: {'Authorization': token,
                        "Content-Type": "application/json"}
                    }).then(res => res.json()).then(data => data.data)
                    let namaPemilik = findUser ? findUser.fullname : ""

                    // sort by nama kandang
                    let namaKandang = data[i].kode ? data[i].kode : ""
                    let namaKandangSTR = namaKandang.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                        return letter.toUpperCase();
                    });
    
                    // if (namaPemilik !== "") {
                        result.push({
                            idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                            namaPemilik: namaPemilik,
                            idKandang: data[i]._id,
                            namaKandang: namaKandangSTR,
                            kota: data[i].kota,
                            isActive: data[i].isActive ? "Aktif" : "Rehat",
                            usia: usia,
                            periodeKe: dataPeriode[0]
                        });
                    // }
                } else {
                    //find detail peternak
                    const findUser = await fetch(`https://${urlAuth}/api/users/${data[i].createdBy}`, {
                        method: 'GET',
                        headers: {'Authorization': token,
                        "Content-Type": "application/json"}
                    }).then(res => res.json()).then(data => data.data)
                    let namaPemilik = findUser ? findUser.fullname : ""

                    // sort by nama kandang
                    let namaKandang = data[i].kode ? data[i].kode : ""
                    let namaKandangSTR = namaKandang.toLowerCase().replace(/\b[a-z]/g, function(letter) {
                        return letter.toUpperCase();
                    });

                    // if (namaPemilik !== "") {
                        result.push({
                            idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                            namaPemilik: namaPemilik,
                            idKandang: data[i]._id,
                            namaKandang: namaKandangSTR,
                            kota: data[i].kota,
                            isActive: data[i].isActive ? "Aktif" : "Rehat",
                            usia: 0,
                            periodeKe: "Belum mulai Periode"
                        });
                    // }
                }
            }
            result.sort(dynamicSort("namaKandang"));
        }

        res.json({
            message: 'Ok',
            length: count,
            data: result
        })
    } catch (error) {
        next(error)
    }
}

exports.dropdownPeriodeDataPool =  async (req, res, next) => {
    try {
        let periode = await Periode.find({kandang: req.params.id}).sort({ createdAt: 1 })
        let result = [];
        for (let i = 0; i < periode.length; i++) {
            result.push({
                id: periode[i].id,
                name: "Periode " + (i+1)
            })
        }
        res.json({
            data: result
        })
    } catch (error) {
        next(error)
    }
}

exports.grafikFeedIntakeDataPool =  async (req, res, next) => {
    try {
        let periode = await Periode.findOne({_id: req.params.id}).sort({ createdAt: 1 })
        let dataSTD = await DataSTD.find().sort({day: 1}).select('day dailyIntake')

        // actual
        let actual = [];
        let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': 1})
        await Promise.map(kegiatanHarianResult, async (kegiatanHarian, index) => {
            //find usia ayam
            const start = new Date(periode.tanggalMulai);
            const tanggal = new Date(kegiatanHarian.tanggal)
            let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

            const beratPakan = kegiatanHarian ? kegiatanHarian.pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

            actual.push({
                day: usiaAyam,
                value: beratPakan
            });
        });

        //standard
        let standard = [];
        for (let i = 0; i < dataSTD.length; i++) {
            standard.push({
                day: dataSTD[i].day,
                value: dataSTD[i].dailyIntake
            })
        }

        // day
        let days = [];
        for (let i = 0; i < dataSTD.length; i++) {
            days.push(dataSTD[i].day)
        }

        res.json({
            actual: actual,
            standard: standard,
            days: days
        })
    } catch (error) {
        next(error)
    }
}

exports.grafikDeplesiDataPool =  async (req, res, next) => {
    try {
        let periode = await Periode.findOne({_id: req.params.id}).sort({ createdAt: 1 })
        let dataSTD = await DataSTD.find().sort({day: 1}).select('day deplesi')

        // actual
        let actual = [];
        let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': 1})
        await Promise.map(kegiatanHarianResult, async (kegiatanHarian, index) => {
            //find usia ayam
            const start = new Date(periode.tanggalMulai);
            const tanggal = new Date(kegiatanHarian.tanggal)
            let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

            actual.push({
                day: usiaAyam,
                value: (kegiatanHarian.deplesi + kegiatanHarian.pemusnahan)
            });
        });

        //standard
        let standard = [];
        for (let i = 0; i < dataSTD.length; i++) {
            standard.push({
                day: dataSTD[i].day,
                value: dataSTD[i].deplesi
            })
        }

        // day
        let days = [];
        for (let i = 0; i < dataSTD.length; i++) {
            days.push(dataSTD[i].day)
        }

        res.json({
            actual: actual,
            standard: standard,
            days: days
        })
    } catch (error) {
        next(error)
    }
}

exports.grafikBobotDataPool =  async (req, res, next) => {
    try {
        let periode = await Periode.findOne({_id: req.params.id}).sort({ createdAt: 1 })
        let dataSTD = await DataSTD.find().sort({day: 1}).select('day bodyWeight')

        // actual
        let actual = [];
        let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': 1})
        await Promise.map(kegiatanHarianResult, async (kegiatanHarian, index) => {
            //find usia ayam
            const start = new Date(periode.tanggalMulai);
            const tanggal = new Date(kegiatanHarian.tanggal)
            let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

            // kalkulasi bobot
            let totalBerat = [];
            for (let i = 0; i < kegiatanHarian.berat.length; i++) {
                let populasi = 0;
                if (kegiatanHarian.berat[i].populasi == 0) {
                    populasi = 1
                } else {
                    populasi = kegiatanHarian.berat[i].populasi
                }
                totalBerat.push(kegiatanHarian.berat[i].beratTimbang / populasi)
            }
            let totalberatSum = totalBerat.reduce(function(acc, val) { return acc + val; }, 0)
            let bobotResult = totalberatSum/kegiatanHarian.berat.length
            let bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
            let totalBobot = isFinite(bobotFixed) && bobotFixed || 0;

            actual.push({
                day: usiaAyam,
                value: totalBobot
            });
        });

        //standard
        let standard = [];
        for (let i = 0; i < dataSTD.length; i++) {
            standard.push({
                day: dataSTD[i].day,
                value: dataSTD[i].bodyWeight
            })
        }

        // day
        let days = [];
        for (let i = 0; i < dataSTD.length; i++) {
            days.push(dataSTD[i].day)
        }

        res.json({
            actual: actual,
            standard: standard,
            days: days
        })
    } catch (error) {
        next(error)
    }
}

exports.findOneDataPool =  async (req, res, next) => {
    try {
        const periode = await Periode.findOne({kandang: req.params.id}).sort({ createdAt: -1 })
        let dataKandang;
        let dataHarian = [];
        let dataSapronak = [];
        let dataNekropsi = [];
        let dataPenjualan = [];
        if (periode && periode.kandang) {
            // get IP
            const sapronak = await Sapronak.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
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
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
            ])

            const dataPakan = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
            ])

            const dataDeplesi = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
            ])

            const getKegiatanHarian = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1}).limit(1).select('-periode')
            const getKegiatan = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1})
                const findBerat = getKegiatan.filter((x) => {
                    var berat = x.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0)
                    return berat !== 0
                })
                const latestWeight = findBerat[0] ? findBerat[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                const latestSampling = findBerat[0] ? findBerat[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0

            const latestFeed = getKegiatanHarian[0] ? getKegiatanHarian[0].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

            const avgLatestWeight = latestWeight/latestSampling

            const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
            const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
            //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
            const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
            const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
            const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);

            const deplesi = (periode.populasi - (periode.populasi - (allDeplesi + allKematian))) * 100 / periode.populasi
            const totalDeplesi = (allDeplesi + allKematian)
            const batasDeplesi = ((2 / 100) * periode.populasi)
            const presentaseAyamHidup = 100 - deplesi
            const populasiAkhir = periode.populasi - (allDeplesi + allKematian)
            const FCR = allPakan / (populasiAkhir * (avgLatestWeight/1000)) 
            const atas = presentaseAyamHidup * (avgLatestWeight/1000)
            const bawah = FCR*(dataPakan.length-1)
            const IP = (atas / bawah) * 100
            const IPFixed = IP.toFixed(2)
            const IPResult = isFinite(IPFixed) && IPFixed || 0

            // get total penjualan
            let harian = []
            let pembelianPakan = 0
            let pembelianOVK = 0
            const getSapronak = await Sapronak.find({periode: periode._id});
            for (let i = 0; i < getSapronak.length; i++) {
                if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                    const compliment = getSapronak[i].zak * getSapronak[i].hargaSatuan
                    pembelianPakan += compliment
                } else {
                    const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                    pembelianOVK += compliment
                }
            }
            const pembelianDoc = periode.populasi * periode.hargaSatuan
            const getPenjualan = await Penjualan.find({periode: periode._id})
            getPenjualan.forEach(x => {
                harian.push(x.beratBadan * x.harga * x.qty)
            })
            const penjualanAyamBesar = harian.reduce(reducer, 0);
            const pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan

            // get periode ke
            const kandang = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
            let dataPeriode = [];
            await Promise.map(kandang, async (kandang, index) => {
                if (kandang._id.toString() === periode._id.toString()) {
                    dataPeriode.push(index + 1);
                }
            });

            // get usia
            const now = new Date(Date.now());
            const start = new Date(periode.tanggalMulai);
            const usia = periode.isEnd ? Math.round(Math.abs((periode.tanggalAkhir - start) / ONE_DAY)) :  Math.round(Math.abs((now - start) / ONE_DAY))

            let feedIntakeACT = populasiAkhir === 0 ? 0 : latestFeed * 1000 / populasiAkhir
            // get Data STD
            const STD = await DataSTD.findOne({day: usia})
            const peternak = await PeternakModel.findById(periode.kandang.createdBy._id).select('fullname phoneNumber')
            const findPPL = await PeternakModel.findById(periode?.ppl);
            dataKandang = {
                idPemilik: periode.kandang.createdBy ? periode.kandang.createdBy._id : null,
                namaPemilik: peternak?.fullname,
                phoneNumber: peternak?.phoneNumber,
                idPPL: findPPL?._id,
                namaPPL: periode?.isActivePPL ? findPPL.fullname : "PPL Not Active",
                phonePPL: periode?.isActivePPL ? findPPL.phoneNumber : null,
                idKandang: periode.kandang._id,
                namaKandang: periode.kandang.kode,
                alamat: periode.kandang.alamat,
                kota: periode.kandang.kota,
                isActive: periode.kandang.isActive,
                jenisKandang: periode.kandang.tipe ? periode.kandang.tipe.tipe : null,
                kapasitas: periode.kandang.populasi,
                idPeriode: periode._id,
                periodeEnd: periode.isEnd,
                periodeKe: dataPeriode[0],
                IP: IPResult,
                totalPenghasilanKandang: pendapatanPeternak,
                DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                populasiAwal: periode.populasi,
                populasiAkhir: populasiAkhir,
                pakanAwal: pakanMasuk,
                pakanPakai: allPakan,
                pakanSisa: (pakanMasuk - allPakan),
                usiaAyam: usia - 1,
                totalDeplesi: totalDeplesi,
                batasDeplesi: batasDeplesi,
                bobotACT: avgLatestWeight,
                bobotSTD: STD ? STD.bodyWeight: 0,
                feedIntakeACT: feedIntakeACT.toFixed(2),
                feedIntakeSTD: STD ? STD.dailyIntake: 0,
                fcrACT: FCR.toFixed(2),
                fcrSTD: STD ? STD.fcr: 0,
                rhpp_path: periode.rhpp_path ? periode.rhpp_path : ""
            }

            // get data harian
            let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': -1})
            await Promise.map(kegiatanHarianResult, async (kegiatanHarian, index) => {
                //find usia ayam
                const tanggal = new Date(kegiatanHarian.tanggal)
                let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

                // kalkulasi bobot
                let totalBerat = [];
                for (let i = 0; i < kegiatanHarian.berat.length; i++) {
                    let populasi = 0;
                    if (kegiatanHarian.berat[i].populasi == 0) {
                        populasi = 1
                    } else {
                        populasi = kegiatanHarian.berat[i].populasi
                    }
                    totalBerat.push(kegiatanHarian.berat[i].beratTimbang / populasi)
                }
                let totalberatSum = totalBerat.reduce(function(acc, val) { return acc + val; }, 0)
                let bobotResult = totalberatSum/kegiatanHarian.berat.length
                let bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
                let totalBobot = isFinite(bobotFixed) && bobotFixed || 0;

                const beratPakan = kegiatanHarian ? kegiatanHarian.pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

                //sisa populasi
                let sisaPopulasi = await KegiatanHarian.find({periode: periode.id, tanggal: {$lte: kegiatanHarian.tanggal}}).select('-periode')
                let totalCulling = sisaPopulasi.reduce((a, {pemusnahan}) => a + pemusnahan, 0);
                let totalMortalitas = sisaPopulasi.reduce((a, {deplesi}) => a + deplesi, 0);
                let ayamHidup = periode.populasi - (totalCulling + totalMortalitas);
                let ayamHidupPercentage = ayamHidup / periode.populasi * 100;

                dataHarian.push({
                    usiaAyam: usiaAyam,
                    tanggal: kegiatanHarian.tanggal,
                    pakanPakai: beratPakan,
                    feedIntake: beratPakan,
                    bobot: totalBobot,
                    deplesi: (kegiatanHarian.deplesi + kegiatanHarian.pemusnahan),
                    mortalitas: kegiatanHarian.deplesi,
                    culling: kegiatanHarian.pemusnahan,
                    ayamHidupPercentage: ayamHidupPercentage.toFixed(2),
                    ayamHidup: ayamHidup
                });
            });

            // get sapronak
            let sapronakResult = await Sapronak.find({periode: periode.id}).sort({'createdAt': -1})
            await Promise.map(sapronakResult, async (sapronakResult, index) => {
                //find usia ayam
                const tanggal = new Date(sapronakResult.tanggal)
                let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

                let totalHarga = 0;
                let quantity = 0;
                if (sapronakResult.produk && (sapronakResult.produk.jenis === 'PAKAN')) {
                    totalHarga = sapronakResult.zak * sapronakResult.hargaSatuan
                    quantity = sapronakResult.zak
                } else {
                    totalHarga = sapronakResult.kuantitas * sapronakResult.hargaSatuan
                    quantity = sapronakResult.kuantitas
                }
                dataSapronak.push({
                    usiaAyam: usiaAyam,
                    tanggal: sapronakResult.tanggal,
                    jenis: sapronakResult.produk ? sapronakResult.produk.jenis : "",
                    produk: sapronakResult.produk ? sapronakResult.produk.merk : "",
                    quantity: quantity,
                    hargaSatuan: sapronakResult.hargaSatuan,
                    totalHarga: totalHarga
                });
            });

            // get nekropsi
            let nekropsiResult = await Nekropsi.find({periode: periode.id}).sort({'tanggal': -1})
            await Promise.map(nekropsiResult, async (nekropsiResult, index) => {
                let penyakit = nekropsiResult.jenisPenyakit[0]
                let namaPenyakit = ""
                if (penyakit.CRD === true) {
                    namaPenyakit = "CRD"
                } else if (penyakit.COLLIBACILOSIS === true) {
                    namaPenyakit = "COLLIBACILOSIS"
                } else if (penyakit.snot === true) {
                    namaPenyakit = "snot"
                } else if (penyakit.colliPanopthalmitis === true) {
                    namaPenyakit = "colliPanopthalmitis"
                } else if (penyakit.gumboro === true) {
                    namaPenyakit = "gumboro"
                } else if (penyakit.ND === true) {
                    namaPenyakit = "ND"
                } else if (penyakit.AI === true) {
                    namaPenyakit = "AI"
                } else if (penyakit.koksidiosis === true) {
                    namaPenyakit = "koksidiosis"
                } else if (penyakit.aspergilosis === true) {
                    namaPenyakit = "aspergilosis"
                } else if (penyakit.candidiasis === true) {
                    namaPenyakit = "candidiasis"
                } else if (penyakit.mikotoksikosis === true) {
                    namaPenyakit = "mikotoksikosis"
                } else if (penyakit.malariaLike === true) {
                    namaPenyakit = "malariaLike"
                }

                dataNekropsi.push({
                    tanggal: nekropsiResult.tanggal,
                    gambar: nekropsiResult.images[index] ? nekropsiResult.images[index].path : "",
                    tindakan: nekropsiResult.actionPlan1,
                    catatan: nekropsiResult.catatan,
                    penyakit: namaPenyakit
                });
            });

            // get penjualan
            let penjualanResult = await Penjualan.find({periode: periode.id}).sort({'tanggal': -1})
            await Promise.map(penjualanResult, async (penjualanResult, index) => {
                dataPenjualan.push({
                    tanggal: penjualanResult.tanggal,
                    tonase: (penjualanResult.qty * penjualanResult.beratBadan),
                    jumlah: penjualanResult.qty,
                    BW: penjualanResult.beratBadan,
                    pembeli: penjualanResult.pembeli,
                    pendapatan: ((penjualanResult.qty * penjualanResult.beratBadan) * penjualanResult.harga),
                    keterangan: penjualanResult.catatan
                });
            });
        } else {
            let kandang = await Model.findOne({_id: req.params.id}).sort({ createdAt: -1 })
            const peternak = await PeternakModel.findById(kandang.createdBy._id).select('fullname phoneNumber')
            const findPPL = await PeternakModel.findById(periode?.ppl);
            dataKandang = {
                idPemilik: kandang.createdBy ? kandang.createdBy._id : null,
                namaPemilik: peternak?.fullname,
                phoneNumber: peternak?.phoneNumber,
                namaPPL: periode?.isActivePPL ? findPPL.fullname : "PPL Not Active",
                phonePPL: periode?.isActivePPL ? findPPL.phoneNumber : null,
                idKandang: kandang._id,
                namaKandang: kandang.kode,
                alamat: kandang.alamat,
                kota: kandang.kota,
                isActive: kandang.isActive,
                jenisKandang: kandang.tipe ? kandang.tipe.tipe : null,
                kapasitas: kandang.populasi,
                idPeriode: null,
                periodeEnd: 0,
                periodeKe: "Belum Mulai Periode",
                IP: 0,
                totalPenghasilanKandang: 0,
                DOC: "",
                populasiAwal: 0,
                populasiAkhir: 0,
                pakanAwal: 0,
                pakanPakai: 0,
                pakanSisa: 0,
                usiaAyam: 0,
                totalDeplesi: 0,
                batasDeplesi: 0,
                bobotACT: 0,
                bobotSTD: 0,
                feedIntakeACT: 0,
                feedIntakeSTD:  0,
                fcrACT: 0,
                fcrSTD: 0,
                rhpp_path: ""
            }
        }

        var sortDataHarian = dataHarian.sort((x, y) => {
            return y.usiaAyam - x.usiaAyam
        })

        res.json({
            dataKandang: dataKandang,
            dataHarian: sortDataHarian,
            dataSapronak: dataSapronak,
            dataNekropsi: dataNekropsi,
            dataPenjualan: dataPenjualan,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.findOnePeriodeDataPool =  async (req, res, next) => {
    try {
        const periode = await Periode.findOne({kandang: req.params.id, _id: req.params.periode}).sort({ createdAt: -1 })
        let dataKandang;
        let dataHarian = [];
        let dataSapronak = [];
        let dataNekropsi = [];
        let dataPenjualan = [];
        if (periode && periode.kandang) {
            // get IP
            const sapronak = await Sapronak.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
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
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
            ])

            const dataPakan = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
            ])

            const dataDeplesi = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(periode.id)}},
                {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
            ])

            const getKegiatanHarian = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1}).limit(1).select('-periode')
            // const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
            // const latestSampling = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
            const latestFeed = getKegiatanHarian[0] ? getKegiatanHarian[0].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

            const getKegiatan = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1})
                const findBerat = getKegiatan.filter((x) => {
                    var berat = x.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0)
                    return berat !== 0
                })
                const latestWeight = findBerat[0] ? findBerat[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                const latestSampling = findBerat[0] ? findBerat[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0


            const avgLatestWeight = latestWeight/latestSampling

            const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
            const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
            //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
            const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
            const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
            const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);

            const deplesi = (periode.populasi - (periode.populasi - (allDeplesi + allKematian))) * 100 / periode.populasi
            const totalDeplesi = (allDeplesi + allKematian)
            const batasDeplesi = ((2 / 100) * periode.populasi)
            const presentaseAyamHidup = 100 - deplesi
            const populasiAkhir = periode.populasi - (allDeplesi + allKematian)
            const FCR = allPakan / (populasiAkhir * (avgLatestWeight/1000)) 
            const atas = presentaseAyamHidup * (avgLatestWeight/1000)
            const bawah = FCR*(dataPakan.length-1)
            const IP = (atas / bawah) * 100
            const IPFixed = IP.toFixed(2)
            const IPResult = isFinite(IPFixed) && IPFixed || 0

            // get total penjualan
            let harian = []
            let pembelianPakan = 0
            let pembelianOVK = 0
            const getSapronak = await Sapronak.find({periode: periode._id});
            for (let i = 0; i < getSapronak.length; i++) {
                if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                    const compliment = getSapronak[i].zak * getSapronak[i].hargaSatuan
                    pembelianPakan += compliment
                } else {
                    const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                    pembelianOVK += compliment
                }
            }
            const pembelianDoc = periode.populasi * periode.hargaSatuan
            const getPenjualan = await Penjualan.find({periode: periode._id})
            getPenjualan.forEach(x => {
                harian.push(x.beratBadan * x.harga * x.qty)
            })
            const penjualanAyamBesar = harian.reduce(reducer, 0);
            const pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan

            // get periode ke
            const kandang = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
            let dataPeriode = [];
            await Promise.map(kandang, async (kandang, index) => {
                if (kandang._id.toString() === periode._id.toString()) {
                    dataPeriode.push(index + 1);
                }
            });

            // get usia
            const now = new Date(Date.now());
            const start = new Date(periode.tanggalMulai);
            const usia = periode.isEnd ? Math.round(Math.abs((periode.tanggalAkhir - start) / ONE_DAY)) :  Math.round(Math.abs((now - start) / ONE_DAY))

            let feedIntakeACT = populasiAkhir !== 0 ? latestFeed * 1000 / populasiAkhir : 0

            // get Data STD
            const STD = await DataSTD.findOne({day: usia - 1})
            const peternak = await PeternakModel.findById(periode.kandang.createdBy._id).select('fullname phoneNumber')
            const findPPL = await PeternakModel.findById(periode?.ppl);

            dataKandang = {
                idPemilik: periode.kandang.createdBy ? periode.kandang.createdBy._id : null,
                namaPemilik: peternak?.fullname,
                phoneNumber: peternak?.phoneNumber,
                idPPL: findPPL?._id,
                namaPPL: periode?.isActivePPL ? findPPL.fullname : "PPL Not Active",
                phonePPL: periode?.isActivePPL ? findPPL.phoneNumber : null,
                idKandang: periode.kandang._id,
                namaKandang: periode.kandang.kode,
                alamat: periode.kandang.alamat,
                kota: periode.kandang.kota,
                isActive: periode.kandang.isActive,
                jenisKandang: periode.kandang.tipe ? periode.kandang.tipe.tipe : null,
                kapasitas: periode.kandang.populasi,
                idPeriode: periode._id,
                periodeEnd: periode.isEnd,
                periodeKe: dataPeriode[0],
                IP: IPResult,
                totalPenghasilanKandang: pendapatanPeternak,
                DOC: periode.jenisDOC ? periode.jenisDOC.name : "",
                populasiAwal: periode.populasi,
                populasiAkhir: populasiAkhir,
                pakanAwal: pakanMasuk,
                pakanPakai: allPakan,
                pakanSisa: (pakanMasuk - allPakan),
                usiaAyam: usia - 1,
                totalDeplesi: totalDeplesi,
                batasDeplesi: batasDeplesi,
                bobotACT: avgLatestWeight,
                bobotSTD: STD ? STD.bodyWeight: 0,
                feedIntakeACT: feedIntakeACT,
                feedIntakeSTD: STD ? STD.dailyIntake: 0,
                fcrACT: FCR.toFixed(2),
                fcrSTD: STD ? STD.fcr: 0,
                rhpp_path: periode.rhpp_path ? periode.rhpp_path : ""
            }

            // get data harian
            let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': -1})
            await Promise.map(kegiatanHarianResult, async (kegiatanHarian, index) => {
                //find usia ayam
                const tanggal = new Date(kegiatanHarian.tanggal)
                let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

                // kalkulasi bobot
                let totalBerat = [];
                for (let i = 0; i < kegiatanHarian.berat.length; i++) {
                    let populasi = 0;
                    if (kegiatanHarian.berat[i].populasi == 0) {
                        populasi = 1
                    } else {
                        populasi = kegiatanHarian.berat[i].populasi
                    }
                    totalBerat.push(kegiatanHarian.berat[i].beratTimbang / populasi)
                }
                let totalberatSum = totalBerat.reduce(function(acc, val) { return acc + val; }, 0)
                let bobotResult = totalberatSum/kegiatanHarian.berat.length
                let bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
                let totalBobot = isFinite(bobotFixed) && bobotFixed || 0;

                const beratPakan = kegiatanHarian ? kegiatanHarian.pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

                dataHarian.push({
                    usiaAyam: usiaAyam,
                    tanggal: kegiatanHarian.tanggal,
                    feedIntake: beratPakan,
                    bobot: totalBobot,
                    deplesi: (kegiatanHarian.deplesi + kegiatanHarian.pemusnahan)
                });
            });

            // get sapronak
            let sapronakResult = await Sapronak.find({periode: periode.id}).sort({'createdAt': -1})
            await Promise.map(sapronakResult, async (sapronakResult, index) => {
                let totalHarga = 0;
                let quantity = 0;
                if (sapronakResult.produk && (sapronakResult.produk.jenis === 'PAKAN')) {
                    totalHarga = sapronakResult.zak * sapronakResult.hargaSatuan
                    quantity = sapronakResult.zak
                } else {
                    totalHarga = sapronakResult.kuantitas * sapronakResult.hargaSatuan
                    quantity = sapronakResult.kuantitas
                }
                dataSapronak.push({
                    tanggal: sapronakResult.tanggal,
                    jenis: sapronakResult.produk ? sapronakResult.produk.jenis : "",
                    produk: sapronakResult.produk ? sapronakResult.produk.merk : "",
                    quantity: quantity,
                    totalHarga: totalHarga
                });
            });

            // get nekropsi
            let nekropsiResult = await Nekropsi.find({periode: periode.id}).sort({'tanggal': -1})
            await Promise.map(nekropsiResult, async (nekropsiResult, index) => {
                let penyakit = nekropsiResult.jenisPenyakit[0]
                let namaPenyakit = ""
                if (penyakit.CRD === true) {
                    namaPenyakit = "CRD"
                } else if (penyakit.COLLIBACILOSIS === true) {
                    namaPenyakit = "COLLIBACILOSIS"
                } else if (penyakit.snot === true) {
                    namaPenyakit = "snot"
                } else if (penyakit.colliPanopthalmitis === true) {
                    namaPenyakit = "colliPanopthalmitis"
                } else if (penyakit.gumboro === true) {
                    namaPenyakit = "gumboro"
                } else if (penyakit.ND === true) {
                    namaPenyakit = "ND"
                } else if (penyakit.AI === true) {
                    namaPenyakit = "AI"
                } else if (penyakit.koksidiosis === true) {
                    namaPenyakit = "koksidiosis"
                } else if (penyakit.aspergilosis === true) {
                    namaPenyakit = "aspergilosis"
                } else if (penyakit.candidiasis === true) {
                    namaPenyakit = "candidiasis"
                } else if (penyakit.mikotoksikosis === true) {
                    namaPenyakit = "mikotoksikosis"
                } else if (penyakit.malariaLike === true) {
                    namaPenyakit = "malariaLike"
                }

                dataNekropsi.push({
                    tanggal: nekropsiResult.tanggal,
                    gambar: nekropsiResult.images[index] ? nekropsiResult.images[index].path : "",
                    tindakan: nekropsiResult.actionPlan1,
                    catatan: nekropsiResult.catatan,
                    penyakit: namaPenyakit
                });
            });

            // get penjualan
            let penjualanResult = await Penjualan.find({periode: periode.id}).sort({'tanggal': -1})
            await Promise.map(penjualanResult, async (penjualanResult, index) => {
                dataPenjualan.push({
                    tanggal: penjualanResult.tanggal,
                    tonase: (penjualanResult.qty * penjualanResult.beratBadan),
                    jumlah: penjualanResult.qty,
                    BW: penjualanResult.beratBadan,
                    pembeli: penjualanResult.pembeli,
                    pendapatan: ((penjualanResult.qty * penjualanResult.beratBadan) * penjualanResult.harga)
                });
            });
        } else {
            let kandang = await Model.findOne({_id: req.params.id}).sort({ createdAt: -1 })
            const peternak = await PeternakModel.findById(periode.kandang.createdBy._id).select('fullname phoneNumber')
            const findPPL = await PeternakModel.findById(periode?.ppl);
            dataKandang = {
                idPemilik: kandang.createdBy ? kandang.createdBy._id : null,
                namaPemilik: peternak?.fullname,
                phoneNumber: peternak?.phoneNumber, 
                namaPPL: periode?.isActivePPL ? findPPL.fullname : "PPL Not Active",
                phonePPL: periode?.isActivePPL ? findPPL.phoneNumber : null,
                idKandang: kandang._id,
                namaKandang: kandang.kode,
                alamat: kandang.alamat,
                kota: kandang.kota,
                isActive: kandang.isActive,
                jenisKandang: kandang.tipe ? kandang.tipe.tipe : null,
                kapasitas: kandang.populasi,
                idPeriode: null,
                periodeEnd: 0,
                periodeKe: "Belum Mulai Periode",
                IP: 0,
                totalPenghasilanKandang: 0,
                DOC: "",
                populasiAwal: 0,
                populasiAkhir: 0,
                pakanAwal: 0,
                pakanPakai: 0,
                pakanSisa: 0,
                usiaAyam: 0,
                totalDeplesi: 0,
                batasDeplesi: 0,
                bobotACT: 0,
                bobotSTD: 0,
                feedIntakeACT: 0,
                feedIntakeSTD:  0,
                fcrACT: 0,
                fcrSTD: 0,
                rhpp_path: ""
            }
        }

        res.json({
            dataKandang: dataKandang,
            dataHarian: dataHarian,
            dataSapronak: dataSapronak,
            dataNekropsi: dataNekropsi,
            dataPenjualan: dataPenjualan,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.exportDataPool =  async (req, res, next) => {
    try {
        let periode = await Periode.findOne({kandang: req.params.id}).sort({ createdAt: -1 })
        let dataHarian = [];
        let dataSapronak = [];
        let merged = [];

        let kegiatanHarianResult = await KegiatanHarian.find({periode: periode.id}).select('-periode').sort({'tanggal': 1})
        for (let i = 0; i < kegiatanHarianResult.length; i++) {
            //find usia ayam
            const start = new Date(periode.tanggalMulai);
            const tanggal = new Date(kegiatanHarianResult[i].tanggal)
            let usiaAyam = Math.round(Math.abs((tanggal - start) / ONE_DAY))

            // kalkulasi bobot
            let totalBerat = [];
            for (let x = 0; x < kegiatanHarianResult[i].berat.length; x++) {
                let populasi = 0;
                if (kegiatanHarianResult[i].berat[x].populasi == 0) {
                    populasi = 1
                } else {
                    populasi = kegiatanHarianResult[i].berat[x].populasi
                }
                totalBerat.push(kegiatanHarianResult[i].berat[x].beratTimbang / populasi)
            }
            let totalberatSum = totalBerat.reduce(function(acc, val) { return acc + val; }, 0)
            let bobotResult = totalberatSum/kegiatanHarianResult[i].berat.length
            let bobotFixed = Number.isInteger(bobotResult) ? bobotResult : bobotResult.toFixed(2);
            let totalBobot = isFinite(bobotFixed) && bobotFixed || 0;

            const beratPakan = kegiatanHarianResult[i] ? kegiatanHarianResult[i].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

            //sisa populasi
            let sisaPopulasi = await KegiatanHarian.find({periode: periode.id, tanggal: {$lte: kegiatanHarianResult[i].tanggal}}).select('-periode')
            let totalCulling = sisaPopulasi.reduce((a, {pemusnahan}) => a + pemusnahan, 0);
            let totalMortalitas = sisaPopulasi.reduce((a, {deplesi}) => a + deplesi, 0);

            dataHarian.push({
                usiaAyam: usiaAyam,
                tanggal: moment(kegiatanHarianResult[i].tanggal).add('hours', 7).format("DD-MM-YYYY"),
                feedIntake: beratPakan,
                bobot: totalBobot,
                mortalitas: kegiatanHarianResult[i].deplesi,
                culling: kegiatanHarianResult[i].pemusnahan,
                sisaPopulasi: periode.populasi - (totalCulling + totalMortalitas),
                sisaSapronak: "",
                FCR: "",
                IP: ""
            });
        }

        let sapronakResult = await Sapronak.find({periode: periode.id}).sort({'createdAt': 1})
        var holder = {};
        await Promise.map(sapronakResult, async (sapronakResult, index) => {
            if (sapronakResult.produk && (sapronakResult.produk.jenis === 'PAKAN')) {
                dataSapronak.push({
                    tanggal: moment(sapronakResult.tanggal).add('hours', 7).format("DD-MM-YYYY"),
                    jenis: sapronakResult.produk.jenis,
                    produk: sapronakResult.produk.merk,
                    quantity: sapronakResult.kuantitas,
                });
            } 
        });

        //sum quantity
        var holder = {};
        dataSapronak.forEach(function(d) {
            if (holder.hasOwnProperty(d.tanggal)) {
                holder[d.tanggal] = holder[d.tanggal] + d.quantity;
            } else {
                holder[d.tanggal] = d.quantity;
            }
        });

        var objQuantity = [];
        for (var prop in holder) {
            objQuantity.push({ tanggal: prop, quantity: holder[prop] });
        }

        //list produk
        var holderProduk = {};
        dataSapronak.forEach(function(d) {
            if (holderProduk.hasOwnProperty(d.tanggal)) {
                holderProduk[d.tanggal] = holderProduk[d.tanggal] + ", " + d.produk;
            } else {
                holderProduk[d.tanggal] = d.produk;
            }
        });

        var objProduk = [];
        for (var propProduk in holderProduk) {
            objProduk.push({ tanggal: propProduk, produk: holderProduk[propProduk] });
        }

        for(let i=0; i<objQuantity.length; i++) {
            merged.push({
                ...objQuantity[i],
                ...objProduk[i]
            });
        }

        const result = dataHarian.map(v => ({ ...v, ...merged.find(sp => sp.tanggal === v.tanggal) }));

        // get periode ke
        const kandang = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
        let dataPeriode = [];
        await Promise.map(kandang, async (kandang, index) => {
            if (kandang._id.toString() === periode._id.toString()) {
                dataPeriode.push(index + 1);
            }
        });

        //export excel
        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet("Recording");

        worksheet.columns = [
            { header: "Usia Ayam", key: "usiaAyam", width: 15 }, 
            { header: "Tanggal", key: "tanggal", width: 15 },
            { header: "Mati", key: "mortalitas", width: 10 },
            { header: "Culling", key: "culling", width: 10 },
            { header: "Sisa Populasi", key: "sisaPopulasi", width: 15 },
            { header: "Feed Intake", key: "feedIntake", width: 15 },
            { header: "Qty Sapronak", key: "quantity", width: 15 },
            { header: "Nama Produk", key: "produk", width: 15 },
            { header: "Sisa Sapronak", key: "sisaSapronak", width: 15 },
            { header: "Bobot", key: "bobot", width: 10 },
            { header: "FCR ACT", key: "fcr", width: 10 },
            { header: "IP", key: "ip", width: 10 },
        ];

        result.forEach((resultItem) => {
            worksheet.addRow(resultItem);
        });

        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
        });

        worksheet.getCell('A1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('B1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('C1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('D1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('E1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('F1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('G1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('H1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('I1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('J1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('K1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        worksheet.getCell('L1').border = {
            top: {style:'thin'},
            left: {style:'thin'},
            bottom: {style:'thin'},
            right: {style:'thin'}
        };
        result.forEach((row, index) => {
            worksheet.getCell('A' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('B' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('C' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('D' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('E' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('F' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('G' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('H' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('I' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('J' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('K' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
            worksheet.getCell('L' + (index + 2)).border = {
                top: {style:'thin'},
                left: {style:'thin'},
                bottom: {style:'thin'},
                right: {style:'thin'}
            };
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=" + periode.kandang.kode + " - Periode ke " + dataPeriode[0] + ".xlsx"
        );
        return workbook.xlsx.write(res).then(function () {
            res.status(200).end();
        });
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
    const token = req.headers['authorization']
    try {
        const results = await Periode.find({kandang: id}).sort('updatedAt')
        const kandang = await Model.findById(id)
        if (results.length > 0){
            const oneDay = 24 * 60 * 60 * 1000;
            const now = new Date(Date.now());
            const start = new Date(results[results.length - 1].tanggalMulai);
            const umurAyam = Math.round(Math.abs((now - start) / oneDay))
            const tmp = results[results.length - 1]
            const findUser = await fetch(`https://${urlAuth}/api/users/${tmp.ppl}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)

            const findPemilik = await fetch(`https://${urlAuth}/api/users/${kandang.createdBy}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)

            res.json({
                age: umurAyam,
                dataLuar: {...tmp.toObject(), userPPL: findUser ? findUser : null, userPemilik: findPemilik},
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
    // const flock = [] 
    try {
        // Check kandang name availability
        const availableKandang = await Model.findOne({ createdBy, kode });
        if (availableKandang) {
            return res.json({ error: 2021, mesage: 'Kandang name is already used for this user'});
        }

        const results = await Model.create({kode, alamat, tipe, isMandiri, kota, createdBy, populasi});
        // console.log(results._id)
        // const body = {
        //     name: 'flock 1',
        //     kandang: results._id
        // }
        // await fetch(`https://${urlIOT}/api/flock`, {
        //     method: 'post',
        //     body: JSON.stringify(body),
        //     headers: {
        //         'Authorization': token,
        //         "Content-Type": "application/json" }
        // }).then(res => res.json()).then(data => flock.push(data))
        // console.log(insertFlock)
        res.json({
            data: results,
            // flock: flock,
            message: 'Ok'
        })
    } catch (error) {
        next(error);
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id;
    const data = req.body;
    const createdBy = req.user._id;

    try {
        // Check kandang name availability
        const availableKandang = await Model.findOne({ createdBy, kode: data.kode });
        if (availableKandang) {
            return res.json({ error: 2021, mesage: 'Kandang name is already used for this user'});
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
    const createdBy = req.user._id;
    try {
        // Check kandang name availability
        const availableKandang = await Model.findOne({ createdBy, kode: data.kode });
        if (availableKandang) {
            return res.json({ error: 2021, mesage: 'Kandang name is already used for this user'});
        }

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
            let periode = await Periode.find({kandang: item._id}).sort({'createdAt': -1})
            for (let i = 0; i < periode.length; i++) {

                const penjualan = await Penjualan.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periode[i].id)}},
                    {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
                ])

                const dataPakan = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periode[i].id)}},
                    {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                    {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
                ])
        
                const dataDeplesi = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(periode[i].id)}},
                    {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
                ])
        
                const getKegiatan = await KegiatanHarian.find({periode: periode[i].id}).sort({'tanggal': -1}).limit(1).select('-periode')
                const now = new Date(Date.now());
                const start = new Date(periode[i].tanggalMulai);
                const oneDay = 24 * 60 * 60 * 1000;
                const umur = Math.round(Math.abs((now - start) / oneDay))

                const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
                const latestSampling = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
                const avgLatestWeight = latestWeight/latestSampling

                const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
                //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);

                const populasiAkhir = periode[i].populasi - (allDeplesi + allKematian)
                const deplesi = (periode[i].populasi - (periode[i].populasi - (allDeplesi + allKematian))) * 100 / periode[i].populasi
                const presentaseAyamHidup = 100 - deplesi
                const FCR = allPakan / (populasiAkhir * (avgLatestWeight/1000)) 
                const atas = presentaseAyamHidup * (avgLatestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                const IP = (atas / bawah) * 100

                dataPeriode.push({
                    idPeriode: periode[i]._id,
                    umurAyam: umur,
                    tanggalMulai: periode[i].tanggalMulai,
                    tanggalAkhir: periode[i].tanggalAkhir,
                    isEnd: periode[i].isEnd,
                    hargaSatuan: periode[i].hargaSatuan,
                    jenisDOC: periode[i].jenisDOC,
                    populasi: periode[i].populasi,
                    IP: IP,
                });
            }

            //get flock
            let flock = [];
            flock = await fetch(`https://${urlIOT}/api/flock/kandang/` + item._id, {
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

const _findPeternak = async (req, isActive) => {
    const user = req.user._id
    const token = req.headers['authorization']
    const findKandang = await Model.find({createdBy: user, isActive: isActive})
    if (findKandang.length === 0) return findKandang
    const map = await Promise.all(findKandang.map(async(x) => {
        const tmp = x
        const findUser = await fetch(`https://${urlAuth}/api/users/${x.createdBy}`, {
            method: 'GET',
            headers: {'Authorization': token,
            "Content-Type": "application/json"}
        }).then(res => res.json()).then(data => data.data)
        isActive ? isEnd = false : isEnd = true
        // const findPeriode = await Periode.countDocumnets({kandang: x._id, isEnd: isEnd}).sort({'tanggalMulai': -1}).limit(1).select('-kandang')
        const urutan = await Periode.countDocuments({kandang: x._id})
        const findPeriode = await Periode.aggregate([
            {$match: {kandang: x._id, isEnd: isEnd}},
            {$addFields: {urutanKe: urutan}},
            {$sort: {tanggalMulai: -1}},
            {$limit: 1}
        ])
        if (findPeriode.length == 0) return {...tmp.toObject(), periode: {}, estimasiPendapatan: 0}
        const pembelianSapronak = await Sapronak.aggregate([
            {$match: {periode: findPeriode[0]._id}},
            {$unwind: '$produk'},
            {$project: {pembelianSapronak: {$cond: {if: '$product.jenis' === 'PAKAN', then: {$multiply: ['$zak', '$hargaSatuan']}, else: {$multiply: ['$kuantitas', '$hargaSatuan']}}}}},
            {$group: {_id: '$periode', totalSapronak: {$sum: '$pembelianSapronak'}}}
        ])
        const pembelianDoc = findPeriode[0].populasi * findPeriode[0].hargaSatuan
        const findPenjualan = await Penjualan.find({periode: findPeriode[0]._id})
        const akumulasiPenjualan = await Penjualan.aggregate([
            {$match: {periode: findPeriode[0]._id}},
            {$project: {penjualan: {$multiply: ['$qty', '$harga', '$beratBadan']}}},
            {$group: {_id: '$periode', totalPenjualan: {$sum: '$penjualan'}}}
        ])
        const penjualan = findPenjualan.length == 0 ? 0 : akumulasiPenjualan[0].totalPenjualan
        const sapronak = pembelianSapronak.length === 0 ? 0 : pembelianSapronak[0].totalSapronak
        const estimasi = penjualan - pembelianDoc - sapronak 
        return {...tmp.toObject(), user: findUser, periode: findPeriode[0], estimasiPendapatan: estimasi}
    }))
    return map
}

exports.listKandangPeternak = async (req, res, next) => {
    try {
        const findActive = await _findPeternak(req, true)
        const findUnactive = await _findPeternak(req, false)
        
        res.json({
            data: {
                kelolaAktif: findActive,
                kelolaRehat: findUnactive
            },
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

const _findPPL = async (req, isActive) => {
    const user = req.user._id
    const token = req.headers['authorization']
    isActive ? isEnd = false : isEnd = true
    const findPeriode = await Periode.aggregate([
        {$match: {ppl: mongoose.Types.ObjectId(user), isActivePPL: isActive}},
        {$sort: {'tanggalAkhir': -1}},
        {$group: {_id: '$_id', id: {$first: '$kandang'}}},
        {$group: {_id: '$id', periode: {$push: '$_id'},}}
    ])
    const map = await Promise.all(findPeriode.map(async (x) => {
        const findPeriode = await Periode.findById(x.periode[0])
        const findKandang = await Model.findOneWithDeleted({_id: x._id})
        const findUser = await fetch(`https://${urlAuth}/api/users/${findKandang.createdBy}`, {
            method: 'GET',
            headers: {'Authorization': token,
            "Content-Type": "application/json"}
        }).then(res => res.json()).then(data => data.data)
        const countPeriode = await Periode.countDocuments({kandang: x._id})
        const pembelianSapronak = await Sapronak.aggregate([
                {$match: {periode: x.periode[0]}},
                {$unwind: '$produk'},
                {$project: {pembelianSapronak: {$cond: {if: '$product.jenis' === 'PAKAN', then: {$multiply: ['$zak', '$hargaSatuan']}, else: {$multiply: ['$kuantitas', '$hargaSatuan']}}}}},
                {$group: {_id: '$periode', totalSapronak: {$sum: '$pembelianSapronak'}}}
            ])
        const pembelianDoc = findPeriode.populasi * findPeriode.hargaSatuan
        const findPenjualan = await Penjualan.find({periode: x.periode[0]})
        const akumulasiPenjualan = await Penjualan.aggregate([
            {$match: {periode: x.periode[0]}},
            {$project: {penjualan: {$multiply: ['$qty', '$harga', '$beratBadan']}}},
            {$group: {_id: '$periode', totalPenjualan: {$sum: '$penjualan'}}}
        ])
        const penjualan = findPenjualan.length === 0 ? 0 : akumulasiPenjualan[0].totalPenjualan
        const sapronak = pembelianSapronak.length === 0 ? 0 : pembelianSapronak[0].totalSapronak
        const estimasi = penjualan - pembelianDoc - sapronak
        
        return {...findKandang.toObject(), user: findUser, periode: findPeriode, urutanKe: countPeriode, estimasiPendapatan: estimasi, isDeleted: "false"}
    }))
    // const filter = map.filter(x => x.isDeleted === "false")
    return map
}

exports.listKandangPPL = async (req, res, next) => {
    try {
        const findActive = await _findPPL(req, true)
        const findUnactive = await _findPPL(req, false)
        
        res.json({
            data: {
                kelolaAktif: findActive,
                kelolaRehat: findUnactive
            },
            message: 'Ok'
        })
    } catch(error){
        next(error)
    }
}

const _kelolaPeternak = async (req) => {
    const user = req.user._id
    const findAktif = Model.find({createdBy: user, isActive: true})
    const findRehat = Model.find({createdBy: user, isActive: false})
    const results = await Promise.all([findAktif, findRehat])
    return {aktif: results[0], rehat: results[1]}
}

exports.kelolaPeternak = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const results = await _kelolaPeternak(req)
        const countActive = results.aktif.length
        const countUnactive = results.rehat.length

        const mapAktif = await Promise.all(results.aktif.map(async(x) => {
            const tmp = x
            const findUser = await fetch(`https://${urlAuth}/api/users/${x.createdBy}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            const urutan = await Periode.countDocuments({kandang: x._id})
            const findPeriode = await Periode.aggregate([
                {$match: {kandang: x._id, isEnd: false}},
                {$addFields: {urutanKe: urutan}},
                {$sort: {createdAt: -1}},
                {$limit: 1}
            ])
            const now = new Date(Date.now())
            const start = new Date(findPeriode[0].tanggalMulai)
            const umur = Math.round(Math.abs((now - start) / ONE_DAY))

            const suhu = await fetch(`https://${urlIOT}/api/flock/kandang/${x._id}`,{
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            return {...tmp.toObject(), user: findUser, umur: umur, periode: findPeriode[0], suhu: suhu[0] ? suhu[0].actualTemperature : 0}
        }))
        res.json({
            data: {
                kandangAktif: countActive,
                kandangRehat: countUnactive,
                kelola: mapAktif
            },
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.kelolaPPL = async (req, res, next) => {
    const user = req.user._id
    const token = req.headers['authorization']
    try {
        const findPeriode = await Periode.find({ppl: user, isActivePPL: true})
        const map = await Promise.all(findPeriode.map(async(x) => {
            const findKandang = await Model.findById(x.kandang)
            const findUser = await fetch(`https://${urlAuth}/api/users/${findKandang.createdBy}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            const now = new Date(Date.now())
            const start = new Date(x.tanggalMulai)
            const umur = Math.round(Math.abs((now - start) / ONE_DAY))
            const getKegiatan = await KegiatanHarian.findOne({periode: x._id}).sort({'tanggal': -1})
            
            const dataDeplesi = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(x.id)}},
                {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
            ])
            const penjualan = await Penjualan.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(x.id)}},
                {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
            ])
    
            const dataPakan = await KegiatanHarian.aggregate([
                {$match: {periode: mongoose.Types.ObjectId(x.id)}},
                {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
            ])
            
            const cumDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
            const cumKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
            const cumPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
            const cumPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
            
            const latestWeight = !getKegiatan ? 0 : getKegiatan.berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0)
            const latestSampling = !getKegiatan ? 0 : getKegiatan.berat.reduce((a, {populasi}) => a + populasi, 0)
            
            const avgLatestWeight = latestWeight == 0 ? 0 : latestWeight/latestSampling

            const populasiAkhir = x.populasi - (cumDeplesi + cumKematian + cumPenjualan)
            
            const deplesi = (x.populasi - (x.populasi - (cumDeplesi + cumKematian))) * 100 / x.populasi
            const presentaseAyamHidup = 100 - deplesi
            const FCR = cumPakan / (populasiAkhir * (avgLatestWeight/1000))

            const atas = presentaseAyamHidup * (avgLatestWeight/1000)
            const bawah = FCR * (dataPakan.length-1)
            const IP = (atas/bawah) * 100

            const suhu = await fetch(`https://${urlIOT}/api/flock/kandang/${x.kandang}`,{
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)

            const countPeriode = await Periode.countDocuments({kandang: x.kandang})

            return {...findKandang.toObject(), user: findUser, IP: IP, umur: umur, periode: x, urutanKe: countPeriode,  suhu: suhu ? suhu[0].actualTemperature : 0}
        }))
        res.json({
            data: {
                kandangAktif: map.length,
                kandangRehat: 0,
                kelola: map
            },
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.detailKandang = async (req,res, next) => {
    const id = req.params.id
    const token = req.headers['authorization']
    try {
        const findKandang = await Model.findById(id)        
        const findPeriode = await Periode.find({kandang: id}).sort({ createdAt: 1})

        const map = await Promise.all(findPeriode.map(async(x) => {
            const findUser = await fetch(`https://${urlAuth}/api/users/${x.createdBy}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            const ppl = await fetch(`https://${urlAuth}/api/users/${x.ppl}`, {
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
            const now = new Date(Date.now())
            const tanggalAkhir = new Date(x.tanggalAkhir)
            const finish = x.isEnd === true ? new Date(x.tanggalAkhir) : new Date(Date.now())
            const start = new Date(x.tanggalMulai)
            const umur = Math.round(Math.abs((finish - start) / ONE_DAY))
            const pembelianSapronak = await Sapronak.aggregate([
                {$match: {periode: x._id}},
                {$unwind: '$produk'},
                {$project: {pembelianSapronak: {$cond: {if: '$product.jenis' === 'PAKAN', then: {$multiply: ['$zak', '$hargaSatuan']}, else: {$multiply: ['$kuantitas', '$hargaSatuan']}}}}},
                {$group: {_id: '$periode', totalSapronak: {$sum: '$pembelianSapronak'}}}
            ])
            const pembelianDoc = x.populasi * x.hargaSatuan
            const findPenjualan = await Penjualan.find({periode: x._id})
            const akumulasiPenjualan = await Penjualan.aggregate([
                {$match: {periode: x._id}},
                {$project: {penjualan: {$multiply: ['$qty', '$harga', '$beratBadan']}}},
                {$group: {_id: '$periode', totalPenjualan: {$sum: '$penjualan'}}}
            ])
            const penjualan = findPenjualan.length == 0 ? 0 : akumulasiPenjualan[0].totalPenjualan
            const sapronak = pembelianSapronak.length === 0 ? 0 : pembelianSapronak[0].totalSapronak
            const estimasi = penjualan - pembelianDoc - sapronak

            return {...x.toObject(), ppl, umur: umur, estimasi: estimasi, user: findUser}
        }))
        const suhu = await fetch(`https://${urlIOT}/api/flock/kandang/${id}`,{
                method: 'GET',
                headers: {'Authorization': token,
                "Content-Type": "application/json"}
            }).then(res => res.json()).then(data => data.data)
        res.json({
            data: {
                informasiKandang: {
                    nama: !findPeriode.length ? findKandang.kode : map[0].kandang.kode,
                    lokasi: !findPeriode.length ? findKandang.alamat : map[0].kandang.alamat,
                    jenis: !findPeriode.length ? findKandang.tipe.tipe : map[0].kandang.tipe.tipe,
                    kapasitas: !findPeriode.length ? findKandang.populasi : map[0].kandang.populasi,
                    penghasilan: !findPeriode.length ? 0 : map[0].kandang.estimasi,
                },
                iot: suhu,
                budidaya: map
            },
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}