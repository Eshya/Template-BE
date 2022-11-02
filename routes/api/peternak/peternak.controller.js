const { parseQuery } = require('../../helpers');
const Model = require('./peternak.model')
const Kandang = require("../kandang/kandang.model");
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Promise = require("bluebird");
const mongoose = require('mongoose');
const fetch = require('node-fetch')
const formula = require('../../helpers/formula');
const reducer = (acc, value) => acc + value;
const {clearKey} = require('../../../configs/redis.conf')

var urlIOT = process.env.IOT_URL
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

function paginate(array, page_size, page_number) {
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { name, address, phoneNumber } = req.query;
        let sort = handleQuerySort(req.query.sort)
        let role = req.user.role ? req.user.role.name : '';
        let kemitraanId = req.user.kemitraanUser ? req.user.kemitraanUser._id : '';
        const filter = {}
        if (name) {
            filter.fullname = new RegExp(name, 'i') 
        }
        if (address) {
            filter.address = new RegExp(address, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }
        filter.role = "61d5608d4a7ba5b05c9c7ae4";
        filter.deleted = false;

        if (!req.query.sort) {
            sort = { fullname: 1 }
        }

        let count;
        let result = [];
        if (role === "adminkemitraan") {
            const data = await Model.find(filter).sort(sort).cache()
            await Promise.map(data, async (dataItem) => {
                const kandang = await Kandang.find({createdBy: dataItem._id, deleted: false}).cache()
                await Promise.map(kandang, async (kandangItem, index) => {
                    // check status peternak
                    let status = false;
                    if (kandangItem.isActive == true) {
                        status = true;
                    }
                    let filterPeriod = {};
                    filterPeriod.kandang = kandangItem.id;
                    filterPeriod.kemitraan = kemitraanId
                    const periode = await Periode.findOne(filterPeriod).sort({ createdAt: -1 }).cache()
                    if (periode && periode.kandang) {
                        result.push({
                            id: dataItem._id,
                            name: dataItem.fullname,
                            username: dataItem.username,
                            email: dataItem.email,
                            address: dataItem.address,
                            phoneNumber: dataItem.phoneNumber,
                            totalKapasitasKandang: kandang.reduce((a, {populasi}) => a + populasi, 0),
                            status: status ? "Aktif" : "Non Aktif"
                        });
                    }
                });
            });
            const seen = new Set();
            const filteredResult = result.filter(el => {
                const duplicate = seen.has(el.id);
                seen.add(el.id);
                return !duplicate;
            });
            count = filteredResult.length
            result = paginate(filteredResult, limit, (offset + 1))
        } else {
            count = await Model.countDocuments(filter)
            const data = await Model.find(filter).limit(limit).skip(offset).sort(sort).cache()
            await Promise.map(data, async (dataItem) => {
                const kandang = await Kandang.find({createdBy: dataItem._id, deleted: false}).cache()
                // check status peternak
                let status = false;
                if (kandang.some(e => e.isActive === true)) {
                    status = true
                }
                result.push({
                    id: dataItem._id,
                    name: dataItem.fullname,
                    username: dataItem.username,
                    email: dataItem.email,
                    address: dataItem.address,
                    phoneNumber: dataItem.phoneNumber,
                    totalKapasitasKandang: kandang.reduce((a, {populasi}) => a + populasi, 0),
                    status: status ? "Aktif" : "Non Aktif"
                });
            });
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

exports.findById = async (req, res, next) => {
    try {
        const token = req.headers['authorization']
        const peternak = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber')
        const kandang = await Kandang.find({createdBy: req.params.id, deleted: false})
        let dataKandang = [];
        await Promise.map(kandang, async (itemKandang) => {
            const periode = await Periode.findOne({kandang: itemKandang._id}).sort({ createdAt: -1 })
            let dataKandangPeriode = [];
            let dataPeriode = [];
            let IP;
            let pendapatanPeternak;
            let flock = [];
            if (periode && periode.kandang) {
                // get IP
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

                const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
                //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const deplesi = (periode.populasi - (periode.populasi - (allDeplesi + allKematian))) * 100 / periode.populasi
                const presentaseAyamHidup = await formula.liveChickenPrecentage(periode._id);
                const populasiAkhir = periode.populasi - (allDeplesi + allKematian)
                const FCR = await formula.FCR(periode._id);
                const atas = presentaseAyamHidup * (latestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                // IP = (atas / bawah) * 100
                IP = await formula.dailyIP(periode._id)


                // get total penjualan
                let harian = []
                let pembelianPakan = 0
                let pembelianOVK = 0
                const getSapronak = await Sapronak.find({periode: periode._id});
                for (let i = 0; i < getSapronak.length; i++) {
                    if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
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
                pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan

                // get periode ke
                const kandang = await Periode.find({kandang: periode.kandang._id}).sort('tanggalMulai')
                await Promise.map(kandang, async (itemKandang, index) => {
                    if (itemKandang._id.toString() === periode._id.toString()) {
                        dataPeriode.push(index + 1);
                    }
                });
                
                flock = await fetch(`http://${urlIOT}/api/flock/datapool/kandang/` + itemKandang._id, {
                    method: 'get',
                    headers: {
                        'Authorization': token,
                        "Content-Type": "application/json" }
                }).then(result => {
                    if (result.ok) {
                        return result.json();
                    }
                });
                
            }
            dataKandangPeriode.push({
                idPemilik: itemKandang.createdBy ? itemKandang.createdBy._id : null,
                namaPemilik: itemKandang.createdBy ? itemKandang.createdBy.fullname : null,
                idKandang: itemKandang._id,
                namaKandang: itemKandang.kode,
                isIoTInstalled:flock.data?.flock.length!=0 ? true : false,
                alamat: itemKandang.alamat,
                kota: itemKandang.kota,
                isActive: itemKandang.isActive,
                jenisKandang: itemKandang.tipe ? itemKandang.tipe.tipe : null,
                kapasitas: itemKandang.populasi,
                periodeEnd: periode ? periode.isEnd : false,
                IP: periode ? IP : 0,
                idPeriode: periode ? periode._id : "",
                periodeKe: periode ? dataPeriode[0] : 0,
                totalPenghasilanKandang: periode ? pendapatanPeternak : 0,
            });
            dataKandang.push(dataKandangPeriode[0]);
        });

        res.json({
            detailPeternak: peternak,
            totalKandang: dataKandang.length,
            detailKandang: dataKandang,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}