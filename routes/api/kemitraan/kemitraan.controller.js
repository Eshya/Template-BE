const { parseQuery } = require('../../helpers');
const Model = require('./kemitraan.model')
const Periode = require('../periode/periode.model')
const KegiatanHarian = require('../kegiatan-harian/kegiatan-harian.model')
const Penjualan = require("../penjualan/penjualan.model");
const Sapronak = require("../sapronak/sapronak.model");
const PeternakModel = require('../peternak/peternak.model');
const Promise = require("bluebird");
const mongoose = require('mongoose');
const formula = require('../../helpers/formula');
const reducer = (acc, value) => acc + value;
const fs = require('fs');
const {clearKey} = require('../../../configs/redis.conf')

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

exports.findAll = async (req, res, next) => {
    try {
      const { limit, offset } = parseQuery(req.query);
      const { name, alamat, email, phoneNumber } = req.query;
      let sort = handleQuerySort(req.query.sort);
      const filter = {};
      if (name) {
        filter.name = new RegExp(name, "i");
      }
      if (alamat) {
        filter.alamat = new RegExp(alamat, "i");
      }
      if (email) {
        filter.email = new RegExp(email, "i");
      }
      if (phoneNumber) {
        filter.phoneNumber = phoneNumber;
      }
      filter.deleted = false;
  
      if (!req.query.sort) {
        sort = { name: 1 };
      }
  
      const partnershipsObject = [];
      const count = await Model.countDocuments(filter);
      const partnerships = await Model.find(filter)
        .limit(limit)
        .skip(offset)
        .sort(sort);
  
      for (const partnership of partnerships) {
        const periods = await Periode.find({
          kemitraan: partnership._id,
          kandang: { $ne: null },
        });
  
        const dataKandangPeriode = []
        await Promise.map(periods, async (itemPeriode) => {
          if (itemPeriode.kandang) {
              // get IP
            dataKandangPeriode.push({
              idKandang: itemPeriode.kandang._id,
              populasi: itemPeriode.populasi
            });
          }
        });
  
        const partnershipData = JSON.parse(JSON.stringify(partnership));
        partnershipData.totalPopulasi = dataKandangPeriode.reduce((a, {populasi}) => a + populasi, 0);
        partnershipData.totalKandang = dataKandangPeriode.length
        partnershipsObject.push(partnershipData)
      }
  
      res.json({
        message: "Ok",
        length: count,
        data: partnershipsObject,
      });
    } catch (error) {
      next(error);
    }
  };

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
                // get IP
                const penjualan = await Penjualan.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.id)}},
                    {$group: {_id: '$_id', terjual: {$sum: '$qty'}}}
                ])

                const dataPakan = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.id)}},
                    {$unwind: {'path': '$pakanPakai', "preserveNullAndEmptyArrays": true}},
                    {$group: {_id: '$_id', totalPakan: {$sum: '$pakanPakai.beratPakan'}}}
                ])

                const dataDeplesi = await KegiatanHarian.aggregate([
                    {$match: {periode: mongoose.Types.ObjectId(itemPeriode.id)}},
                    {$group: {_id: '$_id', totalDeplesi: {$sum: '$deplesi'}, totalKematian: {$sum: '$pemusnahan'}}}
                ])

                const getKegiatan = await KegiatanHarian.find({periode: itemPeriode.id}).sort({'tanggal': -1}).limit(1).select('-periode')
                const latestWeight = getKegiatan[0] ? getKegiatan[0].berat.reduce((a, {beratTimbang}) => a + beratTimbang, 0) : 0

                const allDeplesi = dataDeplesi.reduce((a, {totalDeplesi}) => a + totalDeplesi, 0);
                const allKematian = dataDeplesi.reduce((a, {totalKematian}) => a + totalKematian, 0);
                //const allPenjualan = penjualan.reduce((a, {terjual}) => a + terjual, 0);
                const allPakan = dataPakan.reduce((a, {totalPakan})=>a + totalPakan, 0);
                const deplesi = (itemPeriode.populasi - (itemPeriode.populasi - (allDeplesi + allKematian))) * 100 / itemPeriode.populasi
                // const presentaseAyamHidup = 100 - deplesi
                const presentaseAyamHidup = await formula.liveChickenPrecentage(itemPeriode._id);
                const populasiAkhir = itemPeriode.populasi - (allDeplesi + allKematian )
                const FCR = await formula.FCR(itemPeriode._id) 
                const atas = presentaseAyamHidup * (latestWeight/1000)
                const bawah = FCR*(dataPakan.length-1)
                // const IP = (atas / bawah) * 100
                var IP = await formula.dailyIP(itemPeriode._id)


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
                const peternak = await PeternakModel.findById(itemPeriode.kandang.createdBy._id).select('fullname')
                dataKandangPeriode.push({
                    idPemilik: itemPeriode.kandang.createdBy ? itemPeriode.kandang.createdBy._id : null,
                    namaPemilik: itemPeriode.kandang.createdBy ? (peternak?.fullname ? peternak.fullname : "Not Registered") : null,
                    idKandang: itemPeriode.kandang._id,
                    namaKandang: itemPeriode.kandang.kode,
                    alamat: itemPeriode.kandang.alamat,
                    kota: itemPeriode.kandang.kota,
                    isActive: itemPeriode.kandang.isActive,
                    jenisKandang: itemPeriode.kandang.tipe ? itemPeriode.kandang.tipe.tipe : null,
                    populasi: itemPeriode.kandang.populasi,
                    periodeEnd: itemPeriode.isEnd,
                    IP: IP,
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

        const findNumber = await Model.findOne({phoneNumber: data.phoneNumber})
        if(findNumber) throw res.json({error: 400, message: 'phone number already registered'})
        const result = await Model.create(data)
        clearKey(Model.collection.collectionName);
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
        clearKey(Model.collection.collectionName);
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
        clearKey(Model.collection.collectionName);
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch (error) {
        next(error)
    }
}

exports.removeKemitraanById = async (req, res, next) => {
    let id = req.params.id;
    try {
        const result = await Model.findByIdAndUpdate(id, {deleted: true}, {new: true}).exec();
        clearKey(Model.collection.collectionName);
        if (!result) {
            res.json({error: 404, message: 'Partnership not found.'})
        }
        res.json({
            data: result,
            message: 'Ok'
        })
    } catch(err){
        next(err)
    }
}

