const { parseQuery } = require('../../helpers');
const Model = require('./peternak.model')
const Kandang = require("../kandang/kandang.model");
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Promise = require("bluebird");
const mongoose = require('mongoose');
const reducer = (acc, value) => acc + value;

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

exports.findAll =  async (req, res, next) => {
    try {
        const {limit, offset} = parseQuery(req.query);
        const { name, address, phoneNumber } = req.query;
        const sort = handleQuerySort(req.query.sort)
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

        const count = await Model.countDocuments(filter)
        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort)

        let result = [];
        await Promise.map(data, async (dataItem) => {
            const kandang = await Kandang.find({createdBy: dataItem._id, deleted: false})
            result.push({
                id: dataItem._id,
                name: dataItem.fullname,
                username: dataItem.username,
                email: dataItem.email,
                address: dataItem.address,
                phoneNumber: dataItem.phoneNumber,
                totalKapasitasKandang: kandang.reduce((a, {populasi}) => a + populasi, 0)
            });
        });
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
        const peternak = await Model.findById(req.params.id).select('avatar image noKTP address fullname username email phoneNumber')
        const kandang = await Kandang.find({createdBy: req.params.id, deleted: false})
        let dataKandang = [];
        await Promise.map(kandang, async (itemKandang) => {
            const periode = await Periode.findOne({kandang: itemKandang._id}).sort({ createdAt: -1 })
            let dataKandangPeriode = [];
            let dataPeriode = [];
            let IP;
            let pendapatanPeternak;
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
                const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const deplesi = (periode.populasi - (periode.populasi - (allDeplesi + allKematian))) * 100 / periode.populasi
                const presentaseAyamHidup = 100 - deplesi
                const populasiAkhir = periode.populasi - (allDeplesi + allKematian + allPenjualan)
                const FCR = allPakan / (populasiAkhir * (latestWeight/1000)) 
                const atas = presentaseAyamHidup * (latestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                IP = (atas / bawah) * 100

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
                
            }
            dataKandangPeriode.push({
                idPemilik: itemKandang.createdBy ? itemKandang.createdBy._id : null,
                namaPemilik: itemKandang.createdBy ? itemKandang.createdBy.fullname : null,
                idKandang: itemKandang._id,
                namaKandang: itemKandang.kode,
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