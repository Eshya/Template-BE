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
const selectPublic = '-createdAt -updatedAt';
const fetch = require('node-fetch')
const Promise = require("bluebird");
const reducer = (acc, value) => acc + value;
const ONE_DAY = 24 * 60 * 60 * 1000;

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
            sort = { updatedAt: -1 }
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
    
                    result.push({
                        idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                        namaPemilik: data[i].createdBy ? data[i].createdBy.fullname : null,
                        idKandang: data[i]._id,
                        namaKandang: data[i].kode,
                        kota: data[i].kota,
                        isActive: data[i].isActive ? "Aktif" : "Rehat",
                        usia: usia,
                        periodeKe: dataPeriode[0]
                    });
                }
            }
            count = result.length
            let offsetPaging;
            if (offset == 0) {
                offsetPaging = 1
            } else {
                offsetPaging = (offset / 10 + 1)
            }
            result = paginate(result, limit, offsetPaging)
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
    
                    result.push({
                        idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                        namaPemilik: data[i].createdBy ? data[i].createdBy.fullname : null,
                        idKandang: data[i]._id,
                        namaKandang: data[i].kode,
                        kota: data[i].kota,
                        isActive: data[i].isActive ? "Aktif" : "Rehat",
                        usia: usia,
                        periodeKe: dataPeriode[0]
                    });
                } else {
                    result.push({
                        idPemilik: data[i].createdBy ? data[i].createdBy._id : null,
                        namaPemilik: data[i].createdBy ? data[i].createdBy.fullname : null,
                        idKandang: data[i]._id,
                        namaKandang: data[i].kode,
                        kota: data[i].kota,
                        isActive: data[i].isActive ? "Aktif" : "Rehat",
                        usia: 0,
                        periodeKe: "Belum mulai Periode"
                    });
                }
            }
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

            const getKegiatan = await KegiatanHarian.find({periode: periode.id}).sort({'tanggal': -1}).limit(1).select('-periode')
            const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0
            const latestSampling = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {populasi}) => a + populasi, 0) : 0
            const latestFeed = getKegiatan[0] ? getKegiatan[0].pakanPakai.reduce((a, {beratPakan}) => a + beratPakan, 0) : 0

            const avgLatestWeight = latestWeight/latestSampling

            const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
            const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
            const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
            const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
            const filter_sapronak = sapronak.filter(x => x._id == "PAKAN")
            const pakanMasuk = filter_sapronak.reduce((a, {pakan_masuk}) => a + pakan_masuk, 0);

            const deplesi = (periode.populasi - (periode.populasi - (allDeplesi + allKematian))) * 100 / periode.populasi
            const totalDeplesi = (allDeplesi + allKematian)
            const batasDeplesi = ((2 / 100) * periode.populasi)
            const presentaseAyamHidup = 100 - deplesi
            const populasiAkhir = periode.populasi - (allDeplesi + allKematian + allPenjualan)
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

            let feedIntakeACT = latestFeed * 1000 / populasiAkhir;

            // get Data STD
            const STD = await DataSTD.findOne({day: usia})

            dataKandang = {
                idPemilik: periode.kandang.createdBy ? periode.kandang.createdBy._id : null,
                namaPemilik: periode.kandang.createdBy ? periode.kandang.createdBy.fullname : null,
                phoneNumber: periode.kandang.phoneNumber ? periode.kandang.createdBy.phoneNumber : null,
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
                usiaAyam: usia,
                totalDeplesi: totalDeplesi,
                batasDeplesi: batasDeplesi,
                bobotACT: avgLatestWeight,
                bobotSTD: STD ? STD.bodyWeight: 0,
                feedIntakeACT: feedIntakeACT.toFixed(2),
                feedIntakeSTD: STD ? STD.dailyIntake: 0,
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
        await fetch('http://3.233.186.139:3104/api/flock', {
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
            let periode = await Periode.find({kandang: item._id}).sort({'tanggalMulai': -1})
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