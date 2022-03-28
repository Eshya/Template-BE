const { parseQuery } = require('../../helpers');
const Model = require('./kemitraan.model')
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const Promise = require("bluebird");
const mongoose = require('mongoose');
const reducer = (acc, value) => acc + value;
const fs = require('fs');

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
        const { name, alamat, email, phoneNumber } = req.query;
        const sort = handleQuerySort(req.query.sort)
        const filter = {}
        if (name) {
            filter.name = new RegExp(name, 'i') 
        }
        if (alamat) {
            filter.alamat = new RegExp(alamat, 'i') 
        }
        if (email) {
            filter.email = new RegExp(email, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }

        const count = await Model.countDocuments(filter)
        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort)
        res.json({
            message: 'Ok',
            length: count,
            data: data
        })
    } catch (error) {
        next(error)
    }
}

exports.findById = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.getKandangPeriode = async (req, res, next) => {
    try {
        const kemitraan = await Model.findById(req.params.id)
        const periode = await Periode.find({kemitraan: req.params.id, kandang: { $ne: null }})
        let dataKandangPeriode = [];
        await Promise.map(periode, async (itemPeriode) => {
            if (itemPeriode.kandang) {
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

                // get total penjualan
                let harian = []
                let pembelianPakan = 0
                let pembelianOVK = 0
                const getSapronak = await Sapronak.find({periode: itemPeriode._id});
                for (let i = 0; i < getSapronak.length; i++) {
                    if (getSapronak[i].produk && (getSapronak[i].produk.jenis === 'PAKAN')) {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                        pembelianPakan += compliment
                    } else {
                        const compliment = getSapronak[i].kuantitas * getSapronak[i].hargaSatuan
                        pembelianOVK += compliment
                    }
                }
                const pembelianDoc = itemPeriode.populasi * itemPeriode.hargaSatuan
                const getPenjualan = await Penjualan.find({periode: itemPeriode._id})
                getPenjualan.forEach(x => {
                    harian.push(x.beratBadan * x.harga * x.qty)
                })
                const penjualanAyamBesar = harian.reduce(reducer, 0);
                const pendapatanPeternak = penjualanAyamBesar - pembelianDoc - pembelianOVK - pembelianPakan

                // get periode ke
                const kandang = await Periode.find({kandang: itemPeriode.kandang._id}).sort('tanggalMulai')
                let dataPeriode = [];
                await Promise.map(kandang, async (itemKandang, index) => {
                    if (itemKandang._id.toString() === itemPeriode._id.toString()) {
                        dataPeriode.push(index + 1);
                    }
                });
                dataKandangPeriode.push({
                    idPemilik: itemPeriode.kandang.createdBy ? itemPeriode.kandang.createdBy._id : null,
                    namaPemilik: itemPeriode.kandang.createdBy ? itemPeriode.kandang.createdBy.fullname : null,
                    idKandang: itemPeriode.kandang._id,
                    namaKandang: itemPeriode.kandang.kode,
                    alamat: itemPeriode.kandang.alamat,
                    kota: itemPeriode.kandang.kota,
                    isActive: itemPeriode.kandang.isActive,
                    jenisKandang: itemPeriode.kandang.tipe ? itemPeriode.kandang.tipe.tipe : null,
                    populasi: itemPeriode.kandang.populasi,
                    periodeEnd: itemPeriode.isEnd,
                    IP: bawah == 0 ? (atas/(bawah-1) * 100) : (atas / bawah) * 100,
                    idPeriode: itemPeriode._id,
                    periodeKe: dataPeriode[0],
                    totalPenghasilanKandang: pendapatanPeternak
                });
            }
        });
        res.json({
            detailKemitraan: kemitraan,
            totalKandang: dataKandangPeriode.length,
            detailKandang: dataKandangPeriode,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.insert = async (req, res, next) => {
    const data = req.body
    try {
        if (data.image) {
            const path = 'uploads/images/kemitraan/'+Date.now()+'.png';
            const imgdata = data.image;
            const base64Data = imgdata.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            fs.writeFileSync(path, base64Data,  {encoding: 'base64'});
            data.image = path;
        }
        const result = await Model.create(data)
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.updateById = async (req, res, next) => {
    const id = req.params.id
    const data = req.body
    try {
        if (!data.image) {
            delete data.image
        } else {
            const path = 'uploads/images/kemitraan/'+Date.now()+'.png';
            const imgdata = data.image;
            const base64Data = imgdata.replace(/^data:([A-Za-z-+/]+);base64,/, '');
            fs.writeFileSync(path, base64Data,  {encoding: 'base64'});
            data.image = path;
        }
        const result = await Model.findByIdAndUpdate(id, data, {new: true}).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeById = async (req, res, next) => {
    try {
        const result = await Model.findByIdAndRemove(req.params.id).exec()
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}