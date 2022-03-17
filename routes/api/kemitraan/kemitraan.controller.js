const { parseQuery } = require('../../helpers');
const Model = require('./kemitraan.model')
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Promise = require("bluebird");
const mongoose = require('mongoose');

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
        const { name, alamat, email, phoneNumber, contactPerson } = req.query;
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
        if (contactPerson) {
            filter.contactPerson = new RegExp(contactPerson, 'i') 
        }
        if (phoneNumber) {
            filter.phoneNumber = phoneNumber
        }

        const data = await Model.find(filter).limit(limit).skip(offset).sort(sort)
        res.json({
            message: 'Ok',
            length: data.length,
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

            if (itemPeriode.kandang) {
                dataKandangPeriode.push({
                    idPemilik: itemPeriode.kandang.createdBy ? itemPeriode.kandang.createdBy._id : null,
                    namaPemilik: itemPeriode.kandang.createdBy ? itemPeriode.kandang.createdBy.fullname : null,
                    namaKandang: itemPeriode.kandang.kode,
                    alamat: itemPeriode.kandang.alamat,
                    kota: itemPeriode.kandang.kota,
                    isActive: itemPeriode.kandang.isActive,
                    jenisKandang: itemPeriode.kandang.tipe ? itemPeriode.kandang.tipe.tipe : null,
                    populasi: itemPeriode.kandang.populasi,
                    periodeEnd: itemPeriode.isEnd,
                    IP: bawah == 0 ? (atas/(bawah-1) * 100) : (atas / bawah) * 100,
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